/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionNot extends Action {
    perform() {
        const actions = this._options.actions || [];

        return this._actions.performActions(actions, this._selector)
            .then(result => {
                this.log('Inverting original result %s to %s', result, result);
                return !result;
            });
    }
}

module.exports = ActionNot;

