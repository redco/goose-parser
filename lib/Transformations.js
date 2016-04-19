'use strict';

const debug = require('debug')('Transformations');
const moment = require('moment');
const Storage = require('./Storage');
const _ = require('lodash');

function Transformations(options) {
    this._customTransformations = {};
    this._storage = options.storage || new Storage();
}

Transformations.prototype = {
    constructor: Transformations,

    TYPES: {
        DATE: 'date',
        REPLACE: 'replace',
        MATCH: 'match',
        SPLIT: 'split',
        JOIN: 'join',
        TRIM: 'trim',
        PLUCK: 'pluck',
        COMBINE: 'combine',
        PICK: 'pick',
        GET: 'get',
        DECODE_URL: 'decodeURI'
    },

    /**
     * Perform transformations to result value
     * @param {Array.<Transform>} transformations
     * @param {*} result
     * @returns {*}
     */
    produce: function(transformations, result) {
        transformations = transformations || [];
        debug('transformations are producing for %o on %o', transformations, result);
        return (transformations).reduce(function(result, step) {
            let re;
            let index;
            let matches;

            result = result || '';

            switch (step.type) {
                case this.TYPES.DATE:
                    return moment(result, step.from, step.locale || 'en')
                        .format(step.to);

                case this.TYPES.REPLACE:
                    re = step.re;
                    if (!Array.isArray(re)) {
                        throw new Error('You must pass an array as `re` to `replace` transform');
                    }

                    return result.replace(RegExp.apply(null, re), step.to);

                case this.TYPES.MATCH:
                    re = step.re;
                    index = step.index || 0;
                    matches = result.match(RegExp.apply(null, re));
                    if (step.index === 'any') {
                        return Array.isArray(matches) && matches.length > 0;
                    }
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                case this.TYPES.SPLIT:
                    index = step.index || 0;
                    let separator = step.separator || ',';
                    let dataType = step.dataType || 'string';
                    matches = result.split(separator).map(function(item) {
                        return item.trim();
                    });
                    if (dataType === 'array') {
                        return matches;
                    }
                    return Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;

                case this.TYPES.JOIN:
                    let glue = step.glue || ' ';
                    return Array.isArray(matches) ? matches.join(glue) : matches;

                case this.TYPES.TRIM:
                    return typeof result === 'string' ? result.trim() : result;

                case this.TYPES.PLUCK:
                    return _.pluck(result, step.path);

                case this.TYPES.PICK:
                    return _.pick(result, step.prop);

                case this.TYPES.GET:
                    return _.get(result, step.path, step.default);
                case this.TYPES.DECODE_URL:
                    return decodeURI(result);
                case this.TYPES.COMBINE:
                    const fields = step.fields || [];
                    const type = step.dataType || 'string';
                    const resultValue = [];
                    _.each(fields, field => {
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
    addTransformation: function(type, transformation) {
        if (typeof type !== 'string' || typeof transformation !== 'function') {
            throw new Error('addTransformation accept type as string and transformation as function which must return a transformed value');
        }

        this._customTransformations[type] = transformation;
    }
};

module.exports = Transformations;
