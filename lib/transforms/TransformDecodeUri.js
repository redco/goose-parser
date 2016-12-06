/**
 * @fileOverview
 *
 * This transform decodes URI
 */

'use strict';

const Transform = require('./Transform');

class TransformDecodeUri extends Transform {
    doTransform() {
        return decodeURI(this._value);
    }
}

module.exports = TransformDecodeUri;
