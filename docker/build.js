const fs = require('fs');
const { exec } = require('child_process');
const { dependencies: environmentDependencies } = require('./package.json');

const getVersion = async (environmentName) => {
  return new Promise((resolve, reject) => {
    exec(`npm show ${environmentName} version`, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }

      resolve(stdout.trim());
    });
  });
};

(async function () {
  try {
    const pkg = {
      private: true,
      name: 'goose-parser',
      dependencies: {
        ...environmentDependencies,
        'goose-parser': await getVersion('goose-parser'),
        'minimist': '^1.2.0',
      },
    };
    fs.writeFileSync('./package.json', JSON.stringify(pkg, null, '  '), 'utf-8');
  } catch (e) {
    console.log('Error occurred');
    console.log(e.message, e.stack);
    process.exit(1);
  }
})();
