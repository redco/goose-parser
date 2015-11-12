var vow = require('vow'),
    debug = require('debug')('Environment');

function Environment(options) {
    debug('Initializing..');
}

Environment.prototype = {
    constructor: Environment,

    /**
     * Prepare environment
     * @returns {Promise}
     */
    prepare: function () {
        debug('Preparing...');
        return vow.resolve();
    },

    /**
     * Tear down environment
     * @returns {Promise}
     */
    tearDown: function () {
        debug('Tear down..');
        return vow.resolve();
    },

    /**
     * EvaluateJs in the environment
     * @returns {Promise}
     */
    evaluateJs: function () {
        throw new Error('You must redefine evaluateJs method in child environment');
    },

    /**
     * Take a snapshot
     * @returns {Promise}
     */
    snapshot: function () {
        console.warn('Current environment does not support snapshots');
        return vow.resolve();
    },

    /**
     * Wait for page load
     * @param {number} timeout
     * @returns {Promise}
     */
    waitForPage: function (timeout) {
        throw new Error('You must redefine waitForPage method in child environment');
    }
};

module.exports = Environment;
