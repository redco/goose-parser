/**
 * @fileOverview
 *
 * Perform parallel actions
 */

const Action = require('./Action');
const any = require('promise-any');

class ActionCases extends Action {
    perform() {
        const cases = this._options.cases;
        this.log('Handle several cases in parallel %o', cases);
        let wonCase = null;
        const promises = cases.map(async (actions, caseNumber) => {
            try {
                const beginningPromise = this._actions.performAction(
                    actions[0],
                    this._parentSelector,
                    this._prevResult
                );
                const result = await actions.slice(1)
                    .reduce(async (promise, action, i, array) => {
                        await promise;
                        if (wonCase !== null && array !== cases[wonCase]) {
                            return Promise.reject('Failed actions chain');
                        }

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
                this.log('Chain %o was reject with reason %s', actions, reason);
                throw reason;
            }
        });

        return any(promises).then(() => promises[wonCase]);
    }
}

module.exports = ActionCases;
