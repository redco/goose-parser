/**
 * @fileOverview
 *
 * Perform parallel actions
 */

const Action = require('./Action');
const any = require('../tools/any');

class ActionWaitForCases extends Action {
    async perform() {
        const { cases } = this._options;
        this.log('Handle several cases in parallel %o', cases);
        let wonCase = null;
        const promises = cases.map(async (actions, caseNumber) => {
            try {
                const beginningAction = {
                    ...actions[0],
                    breaker: () => wonCase !== null,
                };
                const beginningPromise = this._actions.performAction(
                    beginningAction,
                    this._parentSelector,
                    this._prevResult
                );
                const result = await actions.slice(1)
                    .reduce(async (promise, action, i, array) => {
                        await promise;

                        if (action.trueCase) {
                            wonCase = caseNumber;
                            this.log('Won case with actions %o', cases[wonCase]);
                        }

                        return this._actions.performAction(action, this._parentSelector, this._prevResult);
                    }, beginningPromise);
                if (wonCase === null) {
                    wonCase = caseNumber;
                    this.log('Won case with actions %o', cases[wonCase]);
                }

                return result;
            } catch (reason) {
                this.log('Chain %o was rejected with reason %s', actions, reason);
                throw reason;
            }
        });

        await any(promises);
        return promises[wonCase];
    }
}

module.exports = ActionWaitForCases;
