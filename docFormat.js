const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const {tests} = require('./tests.json');

const docTpl = fs.readFileSync(path.join(__dirname, 'textTemplate.html'), {
    encoding: 'utf8',
})


const tpl = _.template(docTpl);
const answersPath = path.join(__dirname, 'answers');

for(const test of tests) {
    fs.writeFileSync(path.join(answersPath, `${test.name}.md`), tpl(test));
}
