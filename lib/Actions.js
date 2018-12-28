const debug = require('debug')('Actions');
const merge = require('lodash.merge');
const Storage = require('./Storage');
const actionsFactory = require('./actions/actionsFactory');
const wait = require('./tools/wait');

class Actions {
    /**
     * @param {Object} options
     * @param {AbstractEnvironment} options.environment
     * @param {Parser} options.parser
     * @param {Storage} options.storage
     */
    constructor(options) {
        this._env = options.environment;
        this._parser = options.parser;
        this._storage = options.storage || new Storage();
    }

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string?} parentSelector
     * @returns {Promise}
     */
    async performForRule(rule, parentSelector) {
        const actions = rule.actions;
        const possibleErrors = rule.catchError || {};

        if (!actions) {
            return Promise.resolve();
        }

        try {
            return this.performActions(actions, parentSelector);
        } catch (e) {
            debug('Catching possible errors %o', possibleErrors);
            if (!(e instanceof Error) || !possibleErrors[e.name]) {
                debug('Handler for %o not found', e);
                throw e;
            }

            return this._handleError(possibleErrors[e.name], args);
        }
    }

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
    async _handleError(handlerOptions, actionArgs) {
        debug('Handle error with rules %o', handlerOptions);
        switch (handlerOptions.handler) {
            case 'repeat':
                handlerOptions.__attempt = handlerOptions.__attempt || 0;
                if (++handlerOptions.__attempt > handlerOptions.attempts) {
                    throw new Error('Max attempts limit exceeded');
                }
                const result = await this.performForRule(...actionArgs);
                delete handlerOptions.__attempt;
                return result;

            default:
                throw new Error('Unknown handler ' + handlerOptions.handler);
        }
    }

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string} parentSelector
     * @returns {Promise}
     */
    async performPostActionsForRule(rule, parentSelector) {
        const actions = rule.postActions;

        if (!actions) {
            return Promise.resolve();
        }

        return this.performActions(actions, parentSelector);
    }

    /**
     * Perform array of actions
     * @param {Array} actions
     * @param {string} [parentSelector]
     * @returns {Promise}
     */
    async performActions(actions, parentSelector) {
        if (!Array.isArray(actions)) {
            throw new Error('actions must be an Array');
        }

        debug('Perform actions %o', actions);

        if (!parentSelector) {
            parentSelector = 'body';
            debug('Parent scope switched to %s', parentSelector);
        }

        return actions.reduce(async (promise, action) => {
            if (action.once && action.__done) {
                return promise;
            }

            const prevResult = await promise;
            const result = await this.performAction(action, parentSelector, prevResult);
            action.__done = true;
            return result;
        }, Promise.resolve());
    }

    /**
     * @param {string} name
     * @returns {*}
     */
    get(name) {
        return this._storage.get(name);
    }

    /**
     * @param {string} name
     * @param {*} value
     * @returns {*}
     */
    set(name, value) {
        return this._storage.set(name, value);
    }

    /**
     * @param {string} name
     * @returns {*}
     */
    unset(name) {
        return this._storage.unset(name);
    }

    /**
     * @param {ActionOptions} action
     * @param {string} parentSelector
     * @param {?*} prevResult
     * @returns {Promise}
     */
    async performAction(action, parentSelector, prevResult) {
        const selector = (action.parentScope || parentSelector || '') + ' ' + (action.scope || '');
        debug('Perform action %o for generated selector %s', action, selector);

        let waitForPromise = Promise.resolve();
        if (action.waitForPage || action.type === 'back') {
            waitForPromise = this.performAction({
                type: 'waitForPage',
                timeout: action.waitForPageTimeout
            }, parentSelector, prevResult);
        }

        if (action.waitForQuery) {
            const waitAction = merge({}, action.waitForQuery, {
                type: this.TYPES.WAIT_FOR_QUERY
            });
            waitForPromise = this.performAction(waitAction, parentSelector, prevResult);
        }

        if (action.waitFor) {
            let waitFor = typeof action.waitFor === 'string' ?
              { type: action.waitFor } : action.waitFor;
            waitFor = merge({}, waitFor, {
                type: `waitFor${waitFor.type.charAt(0).toUpperCase() + waitFor.type.slice(1)}`,
            });
            waitForPromise = this.performAction(waitFor, parentSelector, prevResult);
        }

        if (action.cases && action.type !== 'cases') {
            waitForPromise = this.performAction({
                type: 'cases',
                cases: action.cases,
            }, parentSelector, prevResult);
        }

        // mutation for if-then-else action
        if (action.conditions) {
            action.type = 'condition';
        }

        const actionInstance = this._createInstance(action, selector, parentSelector, prevResult);

        if (!actionInstance) {
            Promise.reject(new Error('Unknown action type: ' + action.type));
            return;
        }

        let result = await actionInstance.perform();
        const actionResult = await waitForPromise;

        // mutation for transform action
        if (action.transform) {
            result = this._parser.transform(result, action.transform);
        }

        // mutation for set action
        if (action.set) {
            this.set(action.set, result);
        }

        return actionResult || result;
    }

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
    }

    /**
     * Add custom action
     * @param {string} type
     * @param {Function} action
     */
    addAction(type, action) {
        actionsFactory.addAction(type, action);
    }

    async click(selector) {
        return this.performAction({
            type: 'click',
            scope: selector
        }, '');
    }

    /**
     * Perform page scroll-down
     * @param {number} interval
     * @returns {Promise}
     */
    async scroll(interval) {
        debug('scroll %s px', interval);
        return this._env.evaluateJs(interval, /* @covignore */ function (interval) {
            document.body.scrollTop += interval;
        });
    }
}

module.exports = Actions;
