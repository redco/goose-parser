/**
 * @fileOverview
 *
 * This transform compare value with item, which is retrieved from storage by options.field name
 */

const Transform = require('./Transform');

class TransformCompare extends Transform {
    doTransform() {
        return this._value === this._storage.get(this._options.field);
    }
}

module.exports = TransformCompare;
