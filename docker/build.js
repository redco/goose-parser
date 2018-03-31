const { version } = require('./package.json');
const fs = require('fs');

const environment = process.env.ENV || 'goose-phantom-environment';
const pkg = {
    private: true,
    name: 'goose-parser-dockerized',
    dependencies: {
      'goose-parser': version,
      [environment]: 'latest',
    },
  }
;
fs.writeFileSync('./package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
