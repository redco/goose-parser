'use strict';

var vow = require('vow'),
    debug = require('debug')('Environment');

/**
 * @deprecated Use https://github.com/redco/goose-abstract-environment instead, will be removed in goose-parser 2.0
 */
function Environment(options) {
    debug('Initializing...');

    this._errbacks = [];
    this._options = options;
}

Environment.prototype = {
    constructor: Environment,

    getOptions() {
        return this._options;
    },

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
        debug('Tear down...');
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
    },

    back: function () {
        throw new Error('You must redefine back method in child environment');
    },

    mousedown: function () {
        throw new Error('You must redefine back method in child environment');
    },

    mouseup: function () {
        throw new Error('You must redefine back method in child environment');
    },

    addErrback: function (errback) {
        this._errbacks.push(errback);
    },

    removeErrback: function (errback) {
        this._errbacks = this._errbacks.filter(function (e) {
            return e !== errback;
        });
    }
};

module.exports = Environment;
