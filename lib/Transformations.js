var debug = require('debug')('Transformations'),
    moment = require('moment');

function Transformations() {
    this._customTransformations = {};
}

Transformations.prototype = {
    constructor: Transformations,

    TYPES: {
        DATE: 'date',
        REPLACE: 'replace',
        MATCH: 'match',
        SPLIT: 'split'
    },

    /**
     * Perform transformations to result value
     * @param {Array.<Transform>} transformations
     * @param {*} result
     * @returns {*}
     */
    produce: function (transformations, result) {
        transformations = transformations || [];
        debug('._transformSimpleResult() has called for %o', transformations);
        return (transformations).reduce(function (result, step) {
            switch (step.type) {
                case this.TYPES.DATE:
                    return moment(result, step.from, step.locale || 'en')
                        .format(step.to);

                case this.TYPES.REPLACE:
                    var re = step.re;
                    return result.replace(RegExp.apply(null, re), step.to);

                case this.TYPES.MATCH:
                    var re = step.re;
                    var index = step.index || 0;
                    var matches = result.match(RegExp.apply(null, re));
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                case this.TYPES.SPLIT:
                    var index = step.index || 0;
                    var separator = step.separator || ',';
                    var matches = result.split(separator).map(function (item) {
                        return item.trim();
                    });
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                default:
                    var customTransformation = this._customTransformations[step.type];
                    if (!customTransformation) {
                        throw new Error('Unsupported transformation type: ' + step.type);
                    }

                    return customTransformation.call(this, step, result);
            }
        }.bind(this), result);
    },

    /**
     * Add custom transformation
     * @param {string} type
     * @param {Function} transformation
     */
    addTransformation: function (type, transformation) {
        if (typeof type !== 'string' || typeof transformation !== 'function') {
            throw new Error('addTransformation accept type as string and transformation as function which must return a transformed value');
        }

        this._customTransformations[type] = transformation;
    }
};

module.exports = Transformations;
