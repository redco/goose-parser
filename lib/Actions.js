'use strict';

const debug = require('debug')('Actions');
const vow = require('vow');
const _ = require('lodash');
const Storage = require('./Storage');
const actionsFactory = require('./actions/actionsFactory');
const wait = require('./tools/wait');

function Actions (options) {
    this._env = options.environment;
    this._parser = options.parser;

    this._customActions = {};
    this._storage = options.storage || new Storage();
}

Actions.prototype = {
    TYPES: {
        WAIT_FOR_QUERY: 'waitForQuery',
        BACK: 'back'
    },

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string} parentSelector
     * @returns {Promise}
     */
    performForRule: function(rule, parentSelector) {
        const actions = rule.actions;

        if (!actions) {
            return vow.resolve();
        }

        let promise = this.performActions(actions, parentSelector);
        const possibleErrors = rule.catchError;
        if (possibleErrors) {
            debug('catching possible errors %o', possibleErrors);
            promise = promise.catch(reason => {
                if (!(reason instanceof Error) || !possibleErrors[reason.name]) {
                    debug('Handler for %o not found', reason);
                    throw reason;
                }

                return this._handleError(possibleErrors[reason.name], arguments);
            });
        }

        return promise;
    },

    _handleError: function(handlerDescription, actionArgs) {
        debug('Handle error with rules %o', handlerDescription);
        switch (handlerDescription.handler) {
            case 'repeat':
                handlerDescription.__attempt = handlerDescription.__attempt || 0;
                if (++handlerDescription.__attempt > handlerDescription.attempts) {
                    throw new Error('Max attempts limit exceeded');
                }
                return this.performForRule.apply(this, actionArgs).then(results => {
                    delete handlerDescription.__attempt;
                    return results;
                });

            default:
                throw new Error('Unknown handler ' + handlerDescription.handler);
        }
    },

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string} parentSelector
     * @returns {Promise}
     */
    performPostActionsForRule: function(rule, parentSelector) {
        var actions = rule.postActions;

        if (!actions) {
            return vow.resolve();
        }

        return this.performActions(actions, parentSelector);
    },

    /**
     * Perform array of actions
     * @param {Array} actions
     * @param {string} [parentSelector]
     * @returns {Promise}
     */
    performActions: function(actions, parentSelector) {
        if (!Array.isArray(actions)) {
            throw new Error('actions must be an Array');
        }

        debug('Perform actions %o', actions);

        if (parentSelector == undefined) {
            parentSelector = 'body';
            debug('Parent scope switched to %s', parentSelector);
        }

        var self = this;
        return actions.reduce(function(promise, action) {
            if (action.once && action.__done) {
                return promise;
            }

            return promise
                .then(function(previousActionResult) {
                    return self._performAction(action, parentSelector, previousActionResult);
                })
                .then(function(result) {
                    action.__done = true;
                    return result;
                });
        }, vow.resolve());
    },

    /**
     * @param {string} name
     * @returns {*}
     */
    get: function(name) {
        return this._storage.get(name);
    },

    /**
     * @param {string} name
     * @param {*} value
     * @returns {*}
     */
    set: function(name, value) {
        return this._storage.set(name, value);
    },

    /**
     * @param {string} name
     * @returns {*}
     */
    unset: function(name) {
        return this._storage.unset(name);
    },

    /**
     * @param {Action} action
     * @param {string} parentSelector
     * @param {*} previousActionResult
     * @returns {Promise}
     * @private
     */
    _performAction(action, parentSelector, previousActionResult) {
        var selector = (action.parentScope || parentSelector) + ' ' + (action.scope || '');
        debug('Perform action %o for generated selector %s', action, selector);

        var waitingForPage;
        if (action.waitForPage || action.type === this.TYPES.BACK) {
            waitingForPage = this._performAction({
                type: 'waitForPage',
                timeout: action.waitForPageTimeout
            }, parentSelector, previousActionResult);
        } else {
            waitingForPage = vow.resolve();
        }

        var waitingForQuery;
        if (action.waitForQuery) {
            const waitAction = _.merge({}, action.waitForQuery, {
                type: this.TYPES.WAIT_FOR_QUERY
            });
            waitingForQuery = this._performAction(waitAction, parentSelector, previousActionResult);
        } else {
            waitingForQuery = vow.resolve();
        }

        var casesPromise;
        if (action.cases) {
            casesPromise = this._performCases(action.cases, parentSelector, previousActionResult);
        }

        let actionPromise;
        if (action.conditions) {
            actionPromise = this.performConditionalActions(selector, action.conditions, action.actions, action.elseActions);
        } else {
            const actionInstance = actionsFactory.createAction({
                selector,
                actionOptions: action,
                env: this._env,
                parser: this._parser,
                previousActionResult
            });

            if (!actionInstance) {
                return vow.reject(new Error('Unknown action type: ' + action.type));
            }

            actionPromise = actionInstance.perform();
        }

        if (action.transform) {
            actionPromise = actionPromise.then(results => this._parser.transform(results, action.transform));
        }

        if (action.set) {
            actionPromise = actionPromise.then(results => {
                this.set(action.set, results);
                return results;
            });
        }

        return vow
            .all([actionPromise, waitingForPage, waitingForQuery])
            .spread(result => casesPromise || result);
    },

    _performCases: function(cases, parentSelector, previousActionResult) {
        debug('handle several cases in parallel %o', cases);

        var wonCase = null;
        var promises = cases.map(function(actions, caseNumber) {
            var beginningPromise = this._performAction(actions[0], parentSelector, previousActionResult);
            return actions
                .slice(1)
                .reduce(function(promise, action, i, array) {
                    return promise.then(function() {
                        if (wonCase !== null && array !== cases[wonCase]) {
                            return vow.reject('Failed actions chain');
                        }

                        if (action.trueCase) {
                            wonCase = caseNumber;
                            debug('Won case with actions %o', cases[wonCase]);
                        }

                        return this._performAction(action, parentSelector, previousActionResult);
                    }, this);
                }.bind(this), beginningPromise)
                .then(function(results) {
                    if (wonCase === null) {
                        wonCase = caseNumber;
                        debug('Won case with actions %o', cases[wonCase]);
                    }
                    return results;
                }, function(reason) {
                    debug('Chain %o was reject with reason %s', actions, reason);
                    throw reason;
                });
        }, this);

        return vow.any(promises).then(function() {
            return promises[wonCase];
        });
    },

    /**
     * Wait until function evalFunction expected in checkerFunction result
     * @param {Function} evalFunction
     * @param {Function} [checkerFunction]
     * @param {Array} [args]
     * @param {number} [timeout]
     * @param {number} [interval]
     * @returns {Promise}
     */
    wait: function(evalFunction, checkerFunction, args, timeout, interval) {
        return wait(this._env, evalFunction, checkerFunction, args, timeout, interval);
    },

    click: function(selector) {
        return this._performAction({
            type: 'click',
            scope: selector
        }, '');
    },

    /**
     * Perform page scroll-down
     * @param {number} interval
     * @returns {Promise}
     */
    scroll: function(interval) {
        debug('scroll %s px', interval);
        return this._env.evaluateJs(interval, /* @covignore */ function(interval) {
            document.body.scrollTop += interval;
        });
    },

    /**
     * Check conditional action
     * @param {string} selector
     * @param {Array} conditions
     * @param {Array} actions
     * @param {Array} [elseActions]
     * @returns {Promise}
     */
    performConditionalActions: function(selector, conditions, actions, elseActions) {
        return this
            .performActions(conditions, selector)
            .then(result => {
                if (!result) {
                    debug('Conditional actions failed with result %s, skip %o', result, actions);
                    return elseActions ? this.performActions(elseActions, selector) : false;
                }

                debug('Conditional actions return %s, go with real some', result);
                return this.performActions(actions, selector);
            })
    }
};

module.exports = Actions;
