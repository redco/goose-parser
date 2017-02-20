/**
 * @fileOverview
 *
 * Perform parallel actions
 */

'use strict';

const Action = require('./Action');
const vow = require('vow');

class ActionCases extends Action {
    perform() {
        const cases = this._options.cases;
        this.log('Handle several cases in parallel %o', cases);
        let wonCase = null;
        const promises = cases.map((actions, caseNumber) => {
            const beginningPromise = this._actions.performAction(
                actions[0],
                this._parentSelector,
                this._prevResult
            );
            return actions
                .slice(1)
                .reduce((promise, action, i, array) => {
                    return promise.then(() => {
                        if (wonCase !== null && array !== cases[wonCase]) {
                            return vow.reject('Failed actions chain');
                        }

                        if (action.trueCase) {
                            wonCase = caseNumber;
                            this.log('Won case with actions %o', cases[wonCase]);
                        }

                        return this._actions.performAction(action, this._parentSelector, this._prevResult);
                    });
                }, beginningPromise)
                .then(result => {
                    if (wonCase === null) {
                        wonCase = caseNumber;
                        this.log('Won case with actions %o', cases[wonCase]);
                    }
                    return result;
                }, (reason) => {
                    this.log('Chain %o was reject with reason %s', actions, reason);
                    throw reason;
                });
        });

        return vow.any(promises).then(() => promises[wonCase]);
    }
}

module.exports = ActionCases;
