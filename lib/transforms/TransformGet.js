/**
 * @fileOverview
 *
 * This transform retrieves value from result by options.path
 */

const Transform = require('./Transform');
const get = require('lodash.get');

class TransformGet extends Transform {
    doTransform() {
        const defaultValue = this._options.default || '';
        return get(this._value, this._options.path, defaultValue);
    }
}

module.exports = TransformGet;
