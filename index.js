//cookie
const cookie = ''

//课程ID
// const cid = '889967162';

//播放倍速
const speed = 2;

/**
 * main
 */
const args = process.argv.splice(2);
const uooc = new(require('./src/uoocclient'))(cookie);

const learnWithRetry = (cid, speed, retry) => setTimeout(() => {
    uooc.learn(cid, speed).catch(e => {
        console.error(e)
        learnWithRetry(cid, speed, true);
    })
}, retry ? (1000 * 60 * 30) : 0);

if (args[0] && args[0] == "subtitle") {
    uooc.downloadSubtitles(cid);
  } else {
    (async () => {
      const ids = await uooc.getCourseIds();
      ids.forEach(cid => process.nextTick(() => uooc.learn(cid, speed)));
    })()
  } 