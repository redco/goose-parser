/**
 * @fileOverview
 *
 * This transform decodes base64 string
 */

const Transform = require('./Transform');

class TransformBase64Decode extends Transform {
    doTransform() {
        return new Buffer(this._value, 'base64').toString('ascii');
    }
}

module.exports = TransformBase64Decode;
