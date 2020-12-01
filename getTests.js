//播放倍速
const speed = 2;

/**
 * main
 */
const fs = require('fs');
const path = require('path');
const UoocAPI = require('./src/uoocapi');
const Uooc = require('./src/uoocclient');

//cookie
const cookie = fs.readFileSync('./cookie', 'utf-8');

const getCourses = async() => {
    const API = new UoocAPI(cookie);
    const courses = [];
    const ret = await API.getCourseList();
    if (ret.code !== 1) throw new Error(ret.msg);
    ret.data.data.forEach(item => courses.push({
        id: item.id,
        name: item.parent_name
    }))
    return courses;
}

const getTests = async (cid) => {
    const uooc = new Uooc(cookie);
    return await uooc.getTests(cid);
}

const saveFile = path.join(__dirname, 'tests.json');

(async () => {
    const courses = await getCourses();
    const tests = [];
    for (const {id, name} of courses) {
        const test = await getTests(id);
        tests.push({
            name,
            tests: test
        })
    }

    fs.writeFileSync(saveFile, JSON.stringify({tests}));
})()
