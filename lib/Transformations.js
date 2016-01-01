'use strict';

const debug = require('debug')('Transformations');
const moment = require('moment');
const _ = require('lodash');

function Transformations() {
    this._customTransformations = {};
}

Transformations.prototype = {
    constructor: Transformations,

    TYPES: {
        DATE: 'date',
        REPLACE: 'replace',
        MATCH: 'match',
        SPLIT: 'split',
        TRIM: 'trim',
        PLUCK: 'pluck',
        PICK: 'pick',
        GET: 'get'
    },

    /**
     * Perform transformations to result value
     * @param {Array.<Transform>} transformations
     * @param {*} result
     * @returns {*}
     */
    produce: function (transformations, result) {
        transformations = transformations || [];
        debug('transformations are producing for %o on %o', transformations, result);
        return (transformations).reduce(function (result, step) {
            let re;
            let index;
            let matches;

            switch (step.type) {
                case this.TYPES.DATE:
                    return moment(result, step.from, step.locale || 'en')
                        .format(step.to);

                case this.TYPES.REPLACE:
                    re = step.re;
                    return result.replace(RegExp.apply(null, re), step.to);

                case this.TYPES.MATCH:
                    re = step.re;
                    index = step.index || 0;
                    matches = result.match(RegExp.apply(null, re));
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                case this.TYPES.SPLIT:
                    index = step.index || 0;
                    let separator = step.separator || ',';
                    matches = result.split(separator).map(function (item) {
                        return item.trim();
                    });
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                case this.TYPES.TRIM:
                    return typeof result === 'string' ? result.trim() : result;

                case this.TYPES.PLUCK:
                    return _.pluck(result, step.path);

                case this.TYPES.PICK:
                    return _.pick(result, step.prop);

                case this.TYPES.GET:
                    return _.get(result, step.path, step.default);

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
