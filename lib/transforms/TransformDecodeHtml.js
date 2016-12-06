/**
 * @fileOverview
 *
 * This transform decodes HTML entity
 */

'use strict';

const Transform = require('./Transform');
const entities = require('html-entities').Html5Entities;

class TransformDecodeHtml extends Transform {
    doTransform() {
        return entities.decode(this._value);
    }
}

module.exports = TransformDecodeHtml;
