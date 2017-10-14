/**
 * @fileOverview
 *
 * Inverts a result of the passed actions
 *
 */

const Action = require('./Action');

class ActionNot extends Action {
    async perform() {
        const actions = this._options.actions || [];
        const result = await this._actions.performActions(actions, this._selector);
        this.log('Inverting original result %s to %s', result, !result);
        return !result;
    }
}

module.exports = ActionNot;

