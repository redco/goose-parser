/**
 * @fileOverview
 *
 * This transform retrieves from storage by "field" from options.fields and combines into array
 */

const Transform = require('./Transform');
const _ = require('lodash');

class TransformCombine extends Transform {
    doTransform() {
        const fields = this._options.fields || [];
        const type = this._options.dataType || 'string';
        return fields.map(field => {
            const value = this._storage.get(field);
            switch (type) {
                case 'int':
                case 'integer':
                    return parseInt(value);
                case 'number':
                case 'float':
                case 'double':
                    return parseFloat(value);
            }
            return value;
        });
    }
}

module.exports = TransformCombine;
