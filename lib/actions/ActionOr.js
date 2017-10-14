/**
 * @fileOverview
 *
 * Allows to apply Or condition to passed actions
 *
 */

const Action = require('./Action');

class ActionOr extends Action {
    async perform() {
        const actions = this._options.actions || [];

        return actions.reduce(async (promise, action) => {
            const result = await promise;
            if (result) {
                return result;
            }
            return this._actions.performAction(action);
        }, Promise.resolve(false));
    }
}

module.exports = ActionOr;

