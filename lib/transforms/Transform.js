'use strict';

const debug = require('debug')('Transform');

class Transform {
    /**
     * @param {object} options
     * @param {object} options.options Particular transform options
     * @param {*} options.value value before transformation
     * @param {Storage} options.storage
     */
    constructor(options) {
        this._options = options.options;
        this._value = options.value;
        this._storage = options.storage;
    }

    /**
     * @abstract
     * @protected
     */
    doTransform() {
        throw new Error('You must redefine this method in the child class');
    }

    /**
     * Do transformation on value
     * @return {*}
     */
    transform() {
        this.log('applied with options %o on value %o', this._options, this._value);
        const result = this.doTransform();
        this.log('transformed result', result);
        return result;
    }

    /**
     * Uses debug tool to log  msg
     * @param msg
     */
    log(msg) {
        const args = Array.prototype.slice.call(arguments);
        args.splice(0, 1, `[${this._options.type}] ${msg}`);
        debug(...args);
    }
}

module.exports = Transform;
