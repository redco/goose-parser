/**
 * @fileOverview
 *
 * This transform compares value with options.value
 */

'use strict';

const Transform = require('./Transform');

class TransformEqual extends Transform {
    doTransform() {
        return this._value === this._options.value;
    }
}

module.exports = TransformEqual;
