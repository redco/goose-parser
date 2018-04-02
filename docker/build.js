const fs = require('fs');
const { exec } = require('child_process');
const { version } = require('./package.json');

const getVersion = async (environmentName) => {
  return new Promise((resolve, reject) => {
    exec(`npm show ${environmentName} version`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stdout);
    });
  });
};


(async function () {
  try {
    const environmentName = process.env.ENVIRONMENT || 'goose-phantom-environment';
    const environmentVersion = await getVersion(environmentName);
    const pkg = {
      private: true,
      name: 'goose-parser-dockerized',
      dependencies: {
        'goose-parser': version,
        [environmentName]: `^${environmentVersion}`,
      },
    };
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
  } catch (e) {
    console.log('Error occurred');
    console.log(e.message, e.stack);
    process.exit(1);
  }
})();
