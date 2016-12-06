/**
 * @fileOverview
 *
 * This transform applies match function to result using options.re and options.index
 */

'use strict';

const Transform = require('./Transform');

class TransformMatch extends Transform {
    doTransform() {
        const re = this._options.re;
        const index = this._options.index || 0;

        const value = this._value !== undefined ? this._value : '';
        const matches = value.match(RegExp.apply(null, re));

        if (index === 'any') {
            return Array.isArray(matches) && matches.length > 0;
        }
        if (index === 'all') {
            return matches;
        }
        if (matches) {
            const indexArray = !Array.isArray(index) ? [index] : index;
            const matchedIndex = indexArray.find(particularIndex => {
                return matches[particularIndex] !== undefined;
            });
            return matchedIndex !== undefined ? matches[matchedIndex] : null;
        }

        return null;
    }
}

module.exports = TransformMatch;
