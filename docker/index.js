#!/usr/bin/env node
"use strict";

const argv = require('minimist')(process.argv.slice(2));
if (argv.debug !== undefined) {
    process.env['DEBUG'] = argv.debug === '' ? '*' : argv.debug;
}

const isDebugMode = process.env['DEBUG'] !== undefined;
const Goose = require('goose-parser');

const url = argv._[0];

let rules = {rules: {}};
if (argv['rules-file'] !== undefined) {
    rules = require(argv['rules-file']);
}
else {
    try {
        rules = JSON.parse(argv._[1]);
    } catch (e) {
        console.log(e);
    }
}

var env = new Goose.PhantomEnvironment({
    url: url,
    snapshot: false,
    loadImages: true,
    screen: {
        width: 1080,
        height: 768
    },
    webSecurity: false
});

var parser = new Goose.Parser({
    environment: env
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
        console.log(results);
    }, function(e) {
        if (isDebugMode) {
            console.log('Error occurred');
            console.log(e.message, e.stack);
        }
        console.log({"goose-error": e.message});
    });
