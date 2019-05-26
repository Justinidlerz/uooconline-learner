//cookie
const cookie = '_uab_collina=155763057984609790226435; _umdata=GDC394EB00D310790F2FAE6698757B673229E1C; examRemindNum_1504157605=1; cerRemindNum_1504157605=1; examRemindNum_889967162=1; cerRemindNum_889967162=1; JSESSID=3notnn00869j2rndvdmpis1n13; Hm_lvt_d1a5821d95582e27154fc4a1624da9e3=1557630544,1557920313,1558529726; uooc_auth=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJyZW1lbWJlciI6ZmFsc2UsImxvZ2luX2hvc3QiOiJ3d3cudW9vYy5uZXQuY24iLCJzdWIiOiIzMTI4NTQiLCJleHAiOjE1NjExMjE3Mzl9.OAk5eRQShY3RhTQd9s5bI18Rct6JS8Nv3OKfH8PqB4c; user_ad_view_113.97.33.249=1; examRemindNum_151201540=1; cerRemindNum_151201540=1; formpath=/exam/1152622483; formhash=; Hm_lpvt_d1a5821d95582e27154fc4a1624da9e3=1558763042'

//课程ID
// const cid = '889967162';

//播放倍速
const speed = 2;

/**
 * main
 */
const path = require('path');
const fs = require('fs');
const notifier = require('node-notifier');
const args = process.argv.splice(2);
const uooc = new(require('./src/uoocclient'))(cookie);
var nc = new notifier.NotificationCenter();

const read = (cid) => uooc.learn(cid).catch(e => {
  const answersFilePath = path.join(__dirname, `./answers/${cid}.json`);
  let className = '';
  if (fs.existsSync(answersFilePath)) {
    className = require(answersFilePath).name;
  }
  nc.notify(
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

if (args[0] && args[0] == "subtitle") {
    uooc.downloadSubtitles(cid);
  } else {
    (async () => {
      const ids = await uooc.getCourseIds();
      ids.forEach(cid => process.nextTick(() => read(cid)));
    })()
  } 