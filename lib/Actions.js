var debug = require('debug')('Actions'),
    vow = require('vow');

function Actions (options) {
    this._env = options.environment;

    this._customActions = {};
}

Actions.prototype = {
    TYPES: {
        CLICK: 'click',
        WAIT: 'wait',
        TYPE: 'type',
        CONDITION: 'conditionalActions',
        EXIST: 'exist'
    },

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string} parentSelector
     * @returns {Promise}
     */
    performForRule: function (rule, parentSelector) {
        var actions = rule.actions;

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
    performActions: function (actions, parentSelector) {
        if (!Array.isArray(actions)) {
            throw new Error('actions must be an Array');
        }

        debug('Perform actions %o', actions);

        if (parentSelector == undefined) {
            parentSelector = 'body';
            debug('Parent scope switched to %s', parentSelector);
        }

        var self = this;
        return actions.reduce(function (promise, action) {
            if (action.once && action.__done) {
                return promise;
            }

            return promise
                .then(self._performAction.bind(self, action, parentSelector))
                .then(function (result) {
                    action.__done = true;
                    return result;
                });
        }, vow.resolve());
    },

    /**
     * @param {Action} action
     * @param {string} parentSelector
     * @returns {Promise}
     * @private
     */
    _performAction: function (action, parentSelector) {
        var selector = (action.parentScope || parentSelector) + ' ' + (action.scope || '');
        debug('Perform action %o for generated selector %s', action, selector);

        var waitingForPage;
        if (action.waitForPage) {
            waitingForPage = this.waitForPage(action.waitForPageTimeout);
        } else {
            waitingForPage = vow.resolve();
        }

        var actionPromise;
        switch (action.type) {
            case this.TYPES.CLICK:
                actionPromise = this.click(selector);
                break;

            case this.TYPES.WAIT:
                actionPromise = this.waitElement(selector, action.timeout);
                break;

            case this.TYPES.TYPE:
                actionPromise = this.type(selector, action.text);
                break;

            case this.TYPES.CONDITION:
                actionPromise = this.performConditionalActions(selector, action.conditions, action.actions);
                break;

            case this.TYPES.EXIST:
                actionPromise = this.exist(selector);
                break;

            default:
                var customAction = this._customActions[action.type];
                if (!customAction) {
                    return vow.reject(new Error('Unknown action type: ' + action.type));
                }

                actionPromise = customAction.call(this, action);
                break;
        }

        return vow.all([actionPromise, waitingForPage]).spread(function (result) {
            return result;
        });
    },

    /**
     * Add custom action
     * @param {string} type
     * @param {Function} action
     */
    addAction: function (type, action) {
        if (typeof type !== 'string' || typeof action !== 'function') {
            throw new Error('addAction accept type as string and action if function which must return a promise');
        }

        this._customActions[type] = action;
    },

    /**
     * Wait for an element on the page
     * @param {string} selector
     * @param {number} [timeout]
     * @param {number} [interval]
     * @returns {Promise}
     */
    waitElement: function (selector, timeout, interval) {
        debug('._waitElement() ' + selector);
        return this.wait(/* @covignore */ function (selector) {
            return Sizzle(selector).length;
        }, function (foundElementsCount) {
            return !!foundElementsCount;
        }, [selector], timeout, interval);
    },

    /**
     * Wait until function evalFunction expected in checkerFunction result
     * @param {Function} evalFunction
     * @param {Function} checkerFunction
     * @param {Array} [args]
     * @param {number} [timeout]
     * @param {number} [interval]
     * @returns {Promise}
     */
    wait: function (evalFunction, checkerFunction, args, timeout, interval) {
        var deferred = vow.defer();
        args = args || [];
        timeout = timeout || 5000;
        interval = interval || 0;
        var timeoutId = setTimeout(function () {
            clearInterval(intervalId);
            deferred.reject(new Error('Timeout for _wait with arguments: ' + args.toString()));
        }, timeout);

        var evalArgs = args.slice(0);
        evalArgs.push(evalFunction);
        var intervalId = setInterval(function () {
            this._env.evaluateJs
                .apply(this._env, evalArgs)
                .then(function () {
                    if (checkerFunction.apply(null, arguments)) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        deferred.resolve();
                    }
                });
        }.bind(this), interval);

        return deferred.promise();
    },

    /**
     * Perform page scroll-down
     * @param {number} interval
     * @returns {Promise}
     */
    scroll: function (interval) {
        debug('scroll %s px', interval);
        return this._env.evaluateJs(interval, /* @covignore */ function (interval) {
            document.body.scrollTop += interval;
        });
    },

    /**
     * Perform click to specified selector on the page
     * @param {string} selector
     * @returns {Promise}
     */
    click: function (selector) {
        debug('click by %s', selector);
        return this._env.evaluateJs(selector, /* @covignore */ function (selector) {
            var nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].click();
            }

            return nodes.length;
        }).then(function (len) {
            debug('clicked %s nodes', len);
        });
    },

    /**
     * Type text to the element
     * @param {string} selector
     * @param {string} text
     * @returns {Promise}
     */
    type: function (selector, text) {
        debug('typing %s on %s', text, selector);
        return this._env.evaluateJs(selector, text, /* @covignore */ function (selector, text) {
            var nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].value = text;
            }

            return nodes.length;
        }).then(function (len) {
            debug('text types in %s nodes', len);
        });
    },

    /**
     * Wait for new page load
     * @param {number} [timeout]
     * @returns {Promise}
     */
    waitForPage: function (timeout) {
        return this._env.waitForPage(timeout);
    },

    /**
     * Check conditional action
     * @param {string} selector
     * @param {Array} conditions
     * @param {Array} actions
     * @returns {Promise}
     */
    performConditionalActions: function (selector, conditions, actions) {
        return this
            .performActions(conditions, selector)
            .then(function (result) {
                if (!result) {
                    debug('Conditional actions failed with result %s, skip %o', result, actions);
                    return;
                }

                debug('Conditional actions return %s, go with real some', result);
                return this.performActions(actions, selector);
            }, this)
    },

    /**
     * Check if element exists on the page
     * @param {string} selector
     * @returns {Promise}
     */
    exist: function (selector) {
        return this._env.evaluateJs(selector, /* @covignore */ function (selector) {
            return Sizzle(selector).length > 0;
        });
    }
};

module.exports = Actions;
