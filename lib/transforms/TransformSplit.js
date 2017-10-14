/**
 * @fileOverview
 *
 * This transform applies split function to result
 */

const Transform = require('./Transform');

class TransformSplit extends Transform {
    doTransform() {
        const index = this._options.index || 0;
        const dataType = this._options.dataType || 'string';
        const value = typeof this._value === 'string' ? this._value : '';

        let separator = this._options.separator !== undefined ? this._options.separator : ',';
        separator = Array.isArray(separator) ? RegExp.apply(null, separator) : separator;
        const matches = value.split(separator).map(function(item) {
            return item.trim();
        });
        if (dataType === 'array') {
            return matches;
        }
        return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;
    }
}

module.exports = TransformSplit;
