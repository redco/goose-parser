/**
 * @fileOverview
 * Abstract wait action
 */

const Action = require('./Action');
const { waitForEvaluate } = require('../tools/wait');

class ActionWait extends Action {
    /**
     * Wait until function evalFunction expected in checkerFunction result
     * @param {Function} evalFunction
     * @param {Function} [checkerFunction]
     * @param {Function} [breakerFunction]
     * @param {Array} [args]
     * @returns {Promise}
     */
    async wait(evalFunction, checkerFunction, breakerFunction, args) {
        return waitForEvaluate(
          this._env,
          evalFunction,
          checkerFunction,
          breakerFunction,
          args,
          this._options.timeout,
          this._options.interval);
    }
}

module.exports = ActionWait;

