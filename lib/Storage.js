const debug = require('debug')('Storage');

class Storage {
    /**
     * @param {?Object} data
     */
    constructor(data) {
        data = data || {};
        this._store = data;
    }

    /**
     * @param {string} name
     * @returns {*}
     */
    get(name) {
        debug('.get %s', name);
        return this._store[name];
    }

    /**
     * @param {string} name
     * @param {*} value
     */
    set(name, value) {
        debug('.set %s %o', name, value);
        this._store[name] = value;
    }

    /**
     * @param {string} name
     */
    unset(name) {
        debug('.unset %s', name);
        delete this._store[name];
    }
}

module.exports = Storage;
