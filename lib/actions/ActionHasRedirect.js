/**
 * @fileOverview
 *
 */

const Action = require('./Action');

class ActionHasRedirect extends Action {
    async perform() {
        return this._env.hasRedirect(this._options.url);
    }
}

module.exports = ActionHasRedirect;

