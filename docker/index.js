const util = require('util');
const minimist = require('minimist');
const Parser = require('goose-parser');
const Environment = require('./environment');

const verbose = process.env.VERBOSE;
const argv = minimist(process.argv.slice(2));

function getRules() {
  let rules;
  const rulesFile = argv['rules-file'];
  if (rulesFile) {
    rules = require(rulesFile);
  } else {
    try {
      rules = JSON.parse(argv._[1]);
    } catch (e) {
      console.error('Error occurred while paring rules');
      throw e;
    }
  }
  return rules;
}

function getEnvOptions() {
  let envOptionsStr = argv['env-options'];
  let envOptions = {
    url: argv._[0],
    snapshot: false,
    loadImages: true,
    screen: {
      width: 1080,
      height: 768,
    },
    webSecurity: false,
  };

  if (envOptionsStr) {
    try {
      envOptions = Object.assign(envOptions, JSON.parse(envOptionsStr));
    } catch (e) {
      console.error('Error occurred while parsing environment options');
      throw e;
    }
  }

  return envOptions;
}

(async function () {
  try {
    const time = (new Date).getTime();
    const parser = new Parser({
      environment: new Environment(getEnvOptions()),
    });
    const results = await parser.parse(getRules());
    if (verbose) {
      console.log('Work is done');
      console.log('Execution time: ' + ((new Date).getTime() - time));
      console.log('Results:');
      console.log(util.inspect(results, { showHidden: false, depth: null }));
    } else {
      console.log(JSON.stringify(results, null, '  '));
    }
  } catch (e) {
    if (verbose) {
      console.log('Error occurred:');
      console.log(e.message, e.stack);
    } else {
      console.log(JSON.stringify({
        error: {
          message: e.message,
          stack: e.stack,
        },
      }));
    }
  }
})();
