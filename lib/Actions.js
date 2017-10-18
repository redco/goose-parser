'use strict';

const debug = require('debug')('Actions');
const vow = require('vow');
const _ = require('lodash');
const Storage = require('./Storage');
const actionsFactory = require('./actions/actionsFactory');
const wait = require('./tools/wait');

function Actions(options) {
    this._env = options.environment;
    this._parser = options.parser;
    this._storage = options.storage || new Storage();
}

Actions.prototype = {
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
        const possibleErrors = rule.catchError || {};
        if (possibleErrors) {
            debug('Catching possible errors %o', possibleErrors);
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

    /**
     * Handle action error
     * @param {object} handlerOptions
     * @param {number} handlerOptions.handler Handler name
     * @param {number} handlerOptions.attempts Number of attempts before cancel with error
     * @param {number} handlerOptions.__attempt Current attempt number
     * @param actionArgs
     * @return {Promise}
     * @private
     */
    _handleError: function(handlerOptions, actionArgs) {
        debug('Handle error with rules %o', handlerOptions);
        switch (handlerOptions.handler) {
            case 'repeat':
                handlerOptions.__attempt = handlerOptions.__attempt || 0;
                if (++handlerOptions.__attempt > handlerOptions.attempts) {
                    throw new Error('Max attempts limit exceeded');
                }
                return this.performForRule(...actionArgs)
                    .then(result => {
                        delete handlerOptions.__attempt;
                        return result;
                    });

            default:
                throw new Error('Unknown handler ' + handlerOptions.handler);
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

        return actions.reduce((promise, action) => {
            if (action.once && action.__done) {
                return promise;
            }

            return promise
                .then(prevResult => this.performAction(action, parentSelector, prevResult))
                .then(result => {
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
     * @param {*} prevResult
     * @returns {Promise}
     */
    performAction(action, parentSelector, prevResult) {
        const selector = (action.parentScope || parentSelector || '') + ' ' + (action.scope || '');
        debug('Perform action %o for generated selector %s', action, selector);

        let waitPromise = vow.resolve();
        if (action.waitForPage || action.type === 'back') {
            waitPromise = this.performAction({
                type: 'waitForPage',
                timeout: action.waitForPageTimeout
            }, parentSelector, prevResult);
        }

        if (action.waitForQuery) {
            const waitAction = _.merge({}, action.waitForQuery, {
                type: this.TYPES.WAIT_FOR_QUERY
            });
            waitPromise = this.performAction(waitAction, parentSelector, prevResult);
        }

        let casesPromise;
        if (action.cases && action.type !== 'cases') {
            debug('action.cases');
            casesPromise = this._createInstance(
                {
                    type: 'cases',
                    cases: action.cases
                },
                selector,
                parentSelector,
                prevResult
            ).perform();
        }

        let actionPromise;

        // mutation for if-then-else action
        if (action.conditions) {
            action.type = 'condition';
        }

        const actionInstance = this._createInstance(action, selector, parentSelector, prevResult);

        if (!actionInstance) {
            return vow.reject(new Error('Unknown action type: ' + action.type));
        }

        actionPromise = vow.resolve(actionInstance.perform());

        if (action.transform) {
            actionPromise = actionPromise.then(result => this._parser.transform(result, action.transform));
        }

        if (action.set) {
            actionPromise = actionPromise.then(result => {
                this.set(action.set, result);
                return result;
            });
        }

        return vow
            .all([actionPromise, waitPromise])
            .spread(result => casesPromise || result);
    },

    /**
     * @param action
     * @param selector
     * @param parentSelector
     * @param prevResult
     * @return {Action}
     * @private
     */
    _createInstance(action, selector, parentSelector, prevResult) {
        return actionsFactory.createAction({
            selector,
            actionOptions: action,
            parentSelector,
            prevResult,
            env: this._env,
            parser: this._parser,
            actions: this
        });
    },

    /**
     * Add custom action
     * @param {string} type
     * @param {Function} action
     */
    addAction: function(type, action) {
        actionsFactory.addAction(type, action);
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
        return this.performAction({
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
        return vow.resolve(this._env.evaluateJs(interval, /* @covignore */ function(interval) {
            document.body.scrollTop += interval;
        }));
    }
};

module.exports = Actions;
