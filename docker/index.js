const util = require('util');
const fs = require('fs');
const minimist = require('minimist');
const Parser = require('goose-parser');
const Environment = require('./environment');

const verbose = process.env.VERBOSE;
const argv = minimist(process.argv.slice(2));

const defaultEnvOptions = {
  url: argv._[0],
  snapshot: false,
  loadImages: true,
  screen: {
    width: 1080,
    height: 768,
  },
  webSecurity: false,
};

/**
 * @param {string} result
 * @return {Promise<*>}
 */
async function writeResult(result) {
  return new Promise((resolve, reject) => {
    const stream = fs.createWriteStream('/tmp/goose-pipe', { flags: 'w', encoding: 'utf8' });
    stream.on('open', () => {
      stream.write(result);
      resolve();
    });
    stream.on('error', (err) => reject(err));
  });
}

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
  let options = {};
  const optionsFile = argv['options-file'];
  if (optionsFile) {
    options = require(optionsFile);
  } else if (argv._[2]) {
    try {
      options = JSON.parse(argv._[2]);
    } catch (e) {
      console.error('Error occurred while parsing environment options');
      throw e;
    }
  }
  options = Object.assign(defaultEnvOptions, options);

  return options;
}

function getStats() {
  return {
    timing: {
      startedAt: (new Date).getTime(),
      finishedAt: null,
      execution: null,
    },
    memory: {
      total: process.memoryUsage().rss / 1024 / 1014,
      used: null,
    },
  };
}

function calcFinishStats(stats) {
  const finishTime = (new Date).getTime();
  const finishMemory = process.memoryUsage().rss / 1024 / 1014;
  return {
    timing: {
      ...stats.timing,
      finishedAt: finishTime,
      execution: finishTime - stats.timing.startedAt,
    },
    memory: {
      total: finishMemory,
      used: finishMemory - stats.memory.total,
    },
  };
}

(async function () {
  const stats = getStats();
  try {
    const time = (new Date).getTime();
    const parser = new Parser({
      environment: new Environment(getEnvOptions()),
    });
    const data = await parser.parse(getRules());
    if (verbose) {
      console.log('Work is done');
      console.log('Execution time: ' + ((new Date).getTime() - time));
      console.log('Results:');
      console.log(util.inspect(data, { showHidden: false, depth: null }));
    } else {
      await writeResult(JSON.stringify({
        data,
        stat: calcFinishStats(stats),
      }, null, '  '));
    }
  } catch (e) {
    if (verbose) {
      console.log('Error occurred:');
      console.log(e.message, e.stack);
    } else {
      await writeResult(JSON.stringify({
        error: {
          message: e.message,
          stack: e.stack,
        },
        stats: calcFinishStats(stats),
      }, null, '  '));
    }
  }
})();
