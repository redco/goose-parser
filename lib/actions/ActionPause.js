/**
 * @fileOverview Pause execution for certain number of seconds
 */

const Action = require('./Action');

class ActionPause extends Action {
    perform () {
        return new Promise(resolve => setTimeout(() => resolve(), this._options.timeout));
    }
}

module.exports = ActionPause;

