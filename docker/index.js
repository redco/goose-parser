"use strict";

const argv = require('minimist')(process.argv.slice(2));
const isDebugMode = process.env.DEBUG !== undefined;
const Goose = require('goose-parser');

const url = argv._[0];

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

let envOptionsStr = argv['env-options'];
let envOptions = {
    url: url,
    snapshot: false,
    loadImages: true,
    screen: {
        width: 1080,
        height: 768
    },
    webSecurity: false
};

if (envOptionsStr) {
    try {
        envOptions = Object.assign(envOptions, JSON.parse(envOptionsStr));
    } catch (e) {
        console.error('Error occurred while parsing environment options');
        throw e;
    }
}

const parser = new Goose.Parser({
    environment: new Goose.PhantomEnvironment(envOptions)
});

const time = (new Date).getTime();
parser
    .parse(rules)
    .done(function(results) {
        if (isDebugMode) {
            console.log('Work is done');
            console.log('Execution time: ' + ((new Date).getTime() - time));
            console.log('Results:');
        }
        console.log(require('util').inspect(results, {showHidden: false, depth: null}));
    }, function(e) {
        if (isDebugMode) {
            console.log('Error occurred');
            console.log(e.message, e.stack);
        }
        console.log({"goose-error": e.message});
    });
