/**
 * @fileOverview
 *
 * This transform retrieves value from result array by options.prop
 */

const Transform = require('./Transform');
const pick = require('lodash.pick');

class TransformPick extends Transform {
    doTransform() {
        return pick(this._value, this._options.prop);
    }
}

module.exports = TransformPick;
