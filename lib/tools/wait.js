'use strict';

const vow = require('vow');
const Promise = vow.Promise;

/**
 * Wait until function evalFunction expected in checkerFunction result
 * @param {Environment} env
 * @param {Function} evalFunction
 * @param {Function} [checkerFunction]
 * @param {Array} [args]
 * @param {number} [timeout]
 * @param {number} [interval]
 * @returns {Promise}
 */
module.exports = function wait (env, evalFunction, checkerFunction, args, timeout, interval) {
    args = args || [];
    checkerFunction = checkerFunction || function(result) {
            return !!result
        };

    timeout = timeout || 5000;
    interval = interval || 10;

    return new Promise((resolve, reject) => {
        const errback = function(msg) {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            reject(new Error('Error during wait with args ' + args.toString() + ': ' + msg));
        };

        const timeoutId = setTimeout(() => {
            env.removeErrback(errback);
            clearInterval(intervalId);
            reject(new Error('Timeout for wait with arguments: ' + args.toString()));
        }, timeout);

        env.addErrback(errback);

        const evalArgs = args.slice(0);
        evalArgs.push(evalFunction);
        var intervalId = setInterval(() => {
            vow.resolve(env.evaluateJs.apply(env, evalArgs))
                .then(function() {
                    if (checkerFunction.apply(null, arguments)) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        env.removeErrback(errback);
                        resolve();
                    }
                });
        }, interval);
    });
};
