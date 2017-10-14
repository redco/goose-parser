/**
 * @fileOverview
 *
 * Navigates to previous page
 */

const Action = require('./Action');

class ActionBack extends Action {
    async perform () {
        return this._env.back();
    }
}

module.exports = ActionBack;

