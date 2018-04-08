/**
 * @fileOverview
 *
 * This transform does a map by result array with field options.path
 */

const Transform = require('./Transform');
const pluck = require('lodash.pluck');

class TransformPluck extends Transform {
    doTransform() {
        return pluck(this._value, this._options.path);
    }
}

module.exports = TransformPluck;
