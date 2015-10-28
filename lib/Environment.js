var vow = require('vow'),
    debug = require('debug')('Environment');

function Environment(options) {
    debug('Initializing..');
}

Environment.prototype = {
    constructor: Environment,

    prepare: function () {
        debug('Preparing..');
        return vow.resolve();
    },

    tearDown: function () {
        debug('Tear down..');
        return vow.resolve();
    },

    evaluateJs: function () {
        throw new Error('You must redefine evaluateJs method in child environment');
    },

    snapshot: function () {
        console.warn('Current environment does not support snapshots');
        return vow.resolve();
    }
};

module.exports = Environment;
