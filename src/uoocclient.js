/*
 * @Author: Jindai Kirin
 * @Date: 2018-11-02 20:55:42
 * @Last Modified by: Jindai Kirin
 * @Last Modified time: 2018-11-11 18:04:30
 */

const getDuration = require('get-video-duration');
const _ = require('lodash');
const UoocAPI = require('./uoocapi');
const srt2txt = require('./srt2txt');
const Fs = require('fs');
const path = require('path');

const VIDEO_MODE = ['10', '20', 10, 20];
const TEXT_MODE = 60;
const TEST_MODE = 80;


const QUESTION_TYPE_MAP = {
	10: 'singleOption',
	11: 'multipleOptions',
	20: 'trueFalse'
}

function clog(str) {
	process.stdout.write(str);
}

function clogln(str = '') {
	console.log(str);
}

function sleep(s) {
	return new Promise(resolve => setTimeout(resolve, s * 1000));
}

class UoocClient {
	constructor(cookie) {
		this.API = new UoocAPI(cookie);
	}

	async getTests(cid) {
		const API = this.API;

		const { code, msg, data } = await API.getTests(cid);
		if (code !== 1) {
			throw new Error(msg);
		}
		const formattedTests = [];
		for (const test of data.data) {
			if (test.status_code == '0') continue;
			try {
				const {code, msg, data: { questions, task } } = await API.getTestDetail(cid, test.id);
				if (code !== 1) {
					throw new Error(msg);
				}
				const question = {
					name: task.name,
					singleOption: [],
					multipleOptions: [],
					trueFalse: [],
				}
				for (const q of questions) {
					question[QUESTION_TYPE_MAP[q.type]].push({
						title: q.question,
						answers: [_.pick(q.options, q.answer)],
					});
				}
				formattedTests.push(question);
			} catch (e) {
				console.log(e, test);
			}
		}
		return formattedTests;
	}

	async downloadSubtitles(cid) {
		const API = this.API;

		let list;

		clog("获取课程视频列表");
		await API.getCatalogList(cid).then(ret => {
			if (ret.code != 1) throw new Error(ret.msg);
			list = ret.data;
		});
		clogln(" √");

		//章节
		for (let chapter of list) {
			let saveFile = `./subtitles/${cid}-${chapter.number}.txt`;
			if (Fs.existsSync(saveFile)) continue;

			Fs.writeFileSync(saveFile, chapter.name + '\n\n', {
				'flag': 'a'
			});

			//小节
			for (let section of chapter.children) {
				if (section.children) {
					for (const childSection of section.children) {
						await this.getChildClass(cid, chapter, childSection);
					}
				} else {
					await this.getChildClass(cid, chapter, section);
				}
			}
		}
	}

	async getChildClass (cid, chapter, section) {
		const API = this.API;
		//资源点
		let resources;
		await API.getUnitLearn(cid, chapter.id, section.id).then(ret => {
			if (ret.code != 1) {
				Fs.unlinkSync(saveFile);
				throw new Error(ret.msg);
			}
			resources = ret.data;
		});

		for (let resource of resources) {
			if (!VIDEO_MODE.includes(resource.type)) continue;

			//字幕
			let subtitle, txt;
			for (let key in resource.subtitle) {
				let pass = true;
				subtitle = resource.subtitle[key][0];
				await srt2txt(subtitle.uri).then(ret => txt = ret).catch(() => pass = false);
				if (pass) {
					clogln('[' + key + '] ' + subtitle.title);
					break;
				}
			}

			Fs.writeFileSync(saveFile, subtitle.title + '\n\n' + txt + '\n\n', {
				'flag': 'a'
			});
		}
	}

	async learn(cid, speed) {
		const API = this.API;
		const answersFilePath = path.join(__dirname, `../answers/${cid}.json`);
		if (Fs.existsSync(answersFilePath)) {
			delete require.cache[require.resolve(answersFilePath)]
			this.answers = require(answersFilePath).answers;
		}

		let list;
		speed *= 0.97;

		clog("获取课程视频列表");
		await API.getCatalogList(cid).then(ret => {
			if (ret.code != 1) throw new Error(ret.msg);
			list = ret.data;
		});
		clogln(" √");

		//章节
		for (let chapter of list) {
			clog('\n' + chapter.name.replace(/^ +/, ''));
			if (chapter.finished || !VIDEO_MODE.includes(chapter.learn_mode)) {
				clogln(" √");
				continue;
			}
			clogln();

			//小节
			for (let section of chapter.children) {
				clog(section.number + ' ' + section.name.replace(/^ +/, ''));
				if (section.finished || !VIDEO_MODE.includes(chapter.learn_mode)) {
					clogln(" √");
					continue;
				}
				clogln();
				if (section.children) {
					for (const childSection of section.children) {
						await this.learnClass(cid, chapter, childSection, speed);
					}
				} else {
					await this.learnClass(cid, chapter, section, speed);
				}
			}
		}
	}
	async learnClass(cid, chapter, section, speed) {
		const API = this.API;
		//资源点
		let resources;
		await API.getUnitLearn(cid, chapter.id, section.id).then(ret => {
			if (ret.code != 1) throw new Error(ret.msg);
			resources = ret.data;
		});
		for (let resource of resources) {
			clog('\t' + (resource.title && resource.title.replace(/^ +/, '')));
			if (resource.finished || !resource.is_task) {
				clogln(" √");
				continue;
			}
			clogln();
			if (VIDEO_MODE.includes(chapter.learn_mode)) {
				clog('\t' + '看视频');
				await this.watchVideo(cid, chapter, section, resource, speed);
			} else if (resource.type == TEXT_MODE) {
				clog('\t' + '文本');
			} else if (resource.type == TEST_MODE) {
				clog('\t' + '答题');
				await this.doTest(cid, resource);
			}

		}
	}


	async doTest(cid, resource) {
		const API = this.API;

		if (!this.answers) {
			throw new Error('你还没有准备答案列表！');
		}

		const questions = await API.getTaskPaper(resource.task_id).then(ret => {
			if (ret.code != 1) throw new Error(ret.msg);
			return ret.data.questions;
		});
		const unit = resource.title.replace(/^([1234567890\.]+).*$/, '$1');
		let answer = this.answers.filter(answer => answer.unit === unit);
		if (answer.length === 1) {
			answer = answer[0].questions;
		} else {
			throw new Error('找不到对应的答案');
		}
		// return
		let data = [];
		for (const question of questions) {
			let foundQuestion = false;
			let foundAnswer = false;
			questionFor:
			for (const a of answer) {
				// 找到题目了
				if (question.question.indexOf(a.question) !== -1) {
					foundQuestion = true;
					for (const option of question.options_app) {
						if (option.value.indexOf(a.answer) !== -1) {
							foundAnswer = true;
							data.push({
								qid: question.id,
								answer: [option.key],
								options: question.options_app.map(option => ({
									checked: false,
									key: option.key,
									keyText: option.key,
									text: option.value
								}))
							});
							break questionFor;
						}
					}
				}
			}
			if (!foundQuestion || !foundAnswer) {
				throw new Error('找不到对应的题目或答案, 题目为：' + question.question);
			}
		}

		await API.commitPaper(cid, resource.task_id, data, '用户提交').then(ret => {
			if (ret.code != 1) throw new Error(ret.msg);
		});
	}

	async watchVideo(cid, chapter, section, resource, speed) {
		const API = this.API;
		//资源信息
		let video_length;
		for (let key in resource.video_url) {
			let pass = true;
			let video_url = encodeURI(resource.video_url[key].source);
			await getDuration(video_url).then(duration => video_length = duration.toFixed(2)).catch(() => pass = false);
			if (pass) break;
		}
		let video_pos = parseFloat(resource.video_pos); //video_pos is a "number"
		let vmax = parseFloat(video_length);

		//模拟学习进度
		let finished = false;
		while (true) {
			clogln('\t' + video_pos.toFixed(2) + '/' + video_length);

			await API.markVideoLearn(cid, chapter.id, section.id, resource.id, video_length, video_pos.toFixed(2)).then(ret => {
				if (ret.code != 1) throw new Error(ret.msg);
				finished = ret.data.finished;
			});

			if (finished) break;
			video_pos += 60 * speed + Math.random();

			let reduce = 0;
			if (video_pos > vmax) {
				reduce = (video_pos - vmax) / speed;
				video_pos = vmax;
			}

			await sleep(65 - reduce);
		}
	}
}


module.exports = UoocClient;
