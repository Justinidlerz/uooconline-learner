//播放倍速
const speed = 2;

/**
 * main
 */
const path = require('path');
const fs = require('fs');
const notifier = require('node-notifier');
const UoocAPI = require('./src/uoocapi');
const Uooc = require('./src/uoocclient');

//cookie
const cookie = fs.readFileSync('./cookie', 'utf-8');

const read = (cid) => {
  const uooc = new(Uooc)(cookie);
  uooc.learn(cid, speed).catch(e => {
    console.log(e);
    const answersFilePath = path.join(__dirname, `./answers/${cid}.json`);
    let className = '';
    if (fs.existsSync(answersFilePath)) {
      className = require(answersFilePath).name;
    }
    notifier.notify(
      {
        title: '课程暂停,请前往完成试题！',
        message: className ? `课名：${className}` : `课程Id: ${cid}`,
        sound: true,
        // wait: true
      },
      function(err, response) {
        setTimeout(() => read(cid), 1000 * 60 * 3);
      }
    );
  })
}

const getCourseIds = async() => {
  const API = new UoocAPI(cookie);
  const courseIds = [];
  const ret = await API.getCourseList();
  if (ret.code !== 1) throw new Error(ret.msg);
  ret.data.data.forEach(item => courseIds.push(item.id))
  if (ret.data.pages > 1) {
    for (let i = 2; i <= ret.data.pages; i++) {
      const nextData = await API.getCourseList(i);
      if (nextData.code !== 1) throw new Error(nextData.msg);
      nextData.data.data.forEach(item => courseIds.push(item.id))
    }
  }
  return courseIds;
}

(async () => {
  const ids = await getCourseIds();
  ids.forEach((cid) => process.nextTick(() => read(cid)));
  // read('210001848')
})()
