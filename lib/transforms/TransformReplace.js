/**
 * @fileOverview
 *
 * This transform applies replace function to result with regex options.re and replace it to options.to
 */

const Transform = require('./Transform');

class TransformReplace extends Transform {
    doTransform() {
        const re = this._options.re;
        if (!Array.isArray(re)) {
            throw new Error('You must pass an array as `re` to `replace` transform');
        }
        const value = typeof this._value === 'string' ? this._value : '';

        return value.replace(RegExp.apply(null, re), this._options.to);
    }
}

module.exports = TransformReplace;
