/**
 * @fileOverview
 *
 * Perform if-then-else conditional action
 */

const Action = require('./Action');

class ActionCondition extends Action {
    async perform() {
        this.log('Condition on %s', this._selector);

        const conditions = this._options.conditions || this._options.if || [];
        const thenActions = this._options.actions || this._options.then || [];
        const elseActions = this._options.elseActions || this._options.else || [];

        const conditionsResult = await this._actions.performActions(conditions, this._selector);
        if (!conditionsResult) {
            this.log('Conditional actions failed with result %s, skip %o', conditionsResult, thenActions);
            return elseActions ? this._actions.performActions(elseActions, this._selector) : false;
        }

        this.log('Conditional actions return %s, go with real some', conditionsResult);
        return this._actions.performActions(thenActions, this._selector);
    }
}

module.exports = ActionCondition;
