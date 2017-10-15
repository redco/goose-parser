var Environment = require('./Environment'),
    debug = require('debug')('BrowserEnvironment'),
    vow = require('vow'),
    _ = require('lodash');

/**
 * @param {object} options
 * @constructor
 */
function BrowserEnvironment (options) {
    debug('Initializing..');
    Environment.call(this, options);
}

BrowserEnvironment.prototype = _.create(Environment.prototype, /**@lends BrowserEnvironment*/{
    evaluateJs: function () {
        var args = Array.prototype.slice.call(arguments, 0);

        var evalFunc = args.pop();
        if (typeof evalFunc !== 'function') {
            throw new Error('You must pass function as last argument to BrowserEnvironment.evaluateJs');
        }

        var result = evalFunc.apply(null, args);
        return vow.resolve(result);
    },

    // todo: write tests
    back: function () {
        window.history.back();
    }
});

module.exports = BrowserEnvironment;
