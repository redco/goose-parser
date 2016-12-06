/**
 * @fileOverview
 *
 * This transform retrieves value from result array by options.prop
 */

'use strict';

const Transform = require('./Transform');
const _ = require('lodash');

class TransformPick extends Transform {
    doTransform() {
        return _.pick(this._value, this._options.prop);
    }
}

module.exports = TransformPick;
