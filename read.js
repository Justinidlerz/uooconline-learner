
const path = require('path');
const fs = require('fs');
const notifier = require('node-notifier');
var nc = new notifier.NotificationCenter();
const Uooc = require('./src/uoocclient');
const cid = process.argv && process.argv[2];

//cookie
const cookie = fs.readFileSync('./cookie', 'utf-8');

const read = (cid) => {
  const uooc = new(Uooc)(cookie);
  uooc.learn(cid).catch(e => {
    const answersFilePath = path.join(__dirname, `./answers/${cid}.json`);
    let className = '';
    if (fs.existsSync(answersFilePath)) {
      className = require(answersFilePath).name;
    }
    nc.notify(
      {
        title: '课程暂停,请前往完成试题！',
        message: className ? `课名：${className}` : `课程Id: ${cid}`,
        // sound: true,
        // wait: true
      },
      function(err, response) {
        // setTimeout(() => read(cid), 1000 * 60 * 3);
      }
    );
  })
}

read(cid);