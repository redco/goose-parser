'use strict';

var debug = require('debug')('Storage'),
    _ = require('lodash');

/**
 * @param {Object} [data]
 * @constructor
 */
function Storage(data) {
    data = data || {};
    this._store = data;
}

Storage.prototype = {
    /**
     * @param {string} name
     * @returns {*}
     */
    get: function(name) {
        debug('.get %s', name);
        return this._store[name];
    },

    /**
     * @param {string} name
     * @param {*} value
     */
    set: function(name, value) {
        debug('.set %s %o', name, value);
        this._store[name] = value;
    },

    /**
     * @param {string} name
     */
    unset: function(name) {
        debug('.unset %s', name);
        delete this._store[name];
    }
};

module.exports = Storage;
