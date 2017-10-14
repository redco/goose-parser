/**
 * @fileOverview
 *
 * This transform applies trim function to result
 */

const Transform = require('./Transform');

class TransformTrim extends Transform {
    doTransform() {
        return typeof this._value === 'string' ? this._value.trim() : this._value;
    }
}

module.exports = TransformTrim;
