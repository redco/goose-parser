/**
 * @fileOverview
 *
 * This transform retrieves from storage by "field" from options.fields and combines into array
 */

'use strict';

const Transform = require('./Transform');
const _ = require('lodash');

class TransformCombine extends Transform {
    doTransform() {
        const fields = this._options.fields || [];
        const type = this._options.dataType || 'string';
        const resultValue = [];
        fields.forEach(field => {
            let value = this._storage.get(field);
            switch (type) {
                case 'int':
                    value = parseInt(value);
                    break;
                case 'number':
                    value = parseFloat(value);
                    break;
            }
            resultValue.push(value);
        });
        return resultValue;
    }
}

module.exports = TransformCombine;
