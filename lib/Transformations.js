var debug = require('debug')('Transformations'),
    moment = require('moment');

function Transformations () {

}

Transformations.prototype = {
    constructor: Transformations,

    TYPES: {
        DATE: 'date',
        REPLACE: 'replace'
    },

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

                default:
                    throw new Error('Unsupported transformation type: ' + step.type);
            }
        }.bind(this), result);
    }
};

module.exports = Transformations;
