/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionOr extends Action {
    perform() {
        const actions = this._options.actions || [];

        return actions.reduce((promise, action) => {
            return promise
                .then((result) => {
                    if (result) {
                        return result;
                    }

                    return this._actions._performAction(action);
                });
        }, Promise.resolve(false));
    }
}

module.exports = ActionOr;

