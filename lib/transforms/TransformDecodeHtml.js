/**
 * @fileOverview
 *
 * This transform decodes HTML entity
 */

const Transform = require('./Transform');
const entities = require('html-entities').Html5Entities;

class TransformDecodeHtml extends Transform {
    doTransform() {
        return entities.decode(this._value);
    }
}

module.exports = TransformDecodeHtml;
