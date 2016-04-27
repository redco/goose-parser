#!/usr/bin/env node
"use strict";

const Goose = require('goose-parser');

const url = process.argv[2];
let rules = {rules: {}};
try {
    rules = JSON.parse(process.argv[3]);
} catch (e) {
    console.log(e);
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
    .done(function (results) {
        console.log('Work is done');
        console.log('Execution time: ' + ((new Date).getTime() - time));
        console.log('Results:');
        console.log(results);
}, function (e) {
    console.log('Error occurred');
    console.log(e.message, e.stack);
});
