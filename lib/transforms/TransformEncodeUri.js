/**
 * @fileOverview
 *
 * This transform encodes URI
 */

'use strict';

const Transform = require('./Transform');

class TransformEncodeUri extends Transform {
    doTransform() {
        return encodeURI(this._value);
    }
}

module.exports = TransformEncodeUri;
