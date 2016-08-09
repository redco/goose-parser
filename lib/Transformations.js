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
        DECODE_URL: 'decodeURI',
        COMPARE: 'compare',
        EQUAL: 'equal'
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
        return transformations.reduce((result, step) => {
            let re;
            let index;
            let matches;
            let transformedResult;

            result = typeof result === 'undefined' ? '' : result;

            switch (step.type) {
                case this.TYPES.DATE:
                    transformedResult = moment(result, step.from, step.locale || 'en')
                        .format(step.to);
                    break;

                case this.TYPES.REPLACE:
                    re = step.re;
                    if (!Array.isArray(re)) {
                        throw new Error('You must pass an array as `re` to `replace` transform');
                    }

                    transformedResult = result.replace(RegExp.apply(null, re), step.to);
                    break;

                case this.TYPES.MATCH:
                    re = step.re;
                    index = step.index || 0;
                    matches = result.match(RegExp.apply(null, re));
                    if (step.index === 'any') {
                        transformedResult = Array.isArray(matches) && matches.length > 0;
                        break;
                    }
                    if (step.index === 'all') {
                        transformedResult = matches;
                        break;
                    }
                    if (matches) {
                        index = !Array.isArray(index) ? [index] : index;
                        const matchedIndex = index.find(particularIndex => {
                            return matches[particularIndex] !== undefined;
                        });
                        transformedResult = matchedIndex !== undefined ? matches[matchedIndex] : null;
                    }
                    else {
                        transformedResult = null;
                    }
                    break;

                case this.TYPES.SPLIT:
                    index = step.index || 0;
                    let separator = step.separator || ',';
                    let dataType = step.dataType || 'string';
                    matches = result.split(separator).map(function(item) {
                        return item.trim();
                    });
                    if (dataType === 'array') {
                        transformedResult = matches;
                        break;
                    }
                    transformedResult = Array.isArray(matches) && matches[index] !== undefined ? matches[index] : null;
                    break;

                case this.TYPES.JOIN:
                    let glue = step.glue || ' ';
                    transformedResult = Array.isArray(matches) ? matches.join(glue) : matches;
                    break;

                case this.TYPES.TRIM:
                    transformedResult = typeof result === 'string' ? result.trim() : result;
                    break;

                case this.TYPES.PLUCK:
                    transformedResult = _.pluck(result, step.path);
                    break;

                case this.TYPES.PICK:
                    transformedResult = _.pick(result, step.prop);
                    break;

                case this.TYPES.GET:
                    transformedResult = _.get(result, step.path, step.default);
                    break;

                case this.TYPES.DECODE_URL:
                    transformedResult = decodeURI(result);
                    break;

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
                    transformedResult = resultValue;
                    break;

                case this.TYPES.COMPARE:
                    transformedResult = result === this._storage.get(step.field);
                    break;

                case this.TYPES.EQUAL:
                    transformedResult = result === step.value;
                    break;

                default:
                    var customTransformation = this._customTransformations[step.type];
                    if (!customTransformation) {
                        throw new Error('Unsupported transformation type: ' + step.type);
                    }

                    transformedResult = customTransformation.call(this, step, result);
                    break;
            }
            debug('Transform %o applied, transformedValue %o', step, transformedResult);
            return transformedResult;
        }, result);
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
