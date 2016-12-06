/**
 * @fileOverview
 *
 * This transform does a map by result array with field options.path
 */

'use strict';

const Transform = require('./Transform');
const _ = require('lodash');

class TransformPluck extends Transform {
    doTransform() {
        return _.pluck(this._value, this._options.path);
    }
}

module.exports = TransformPluck;
