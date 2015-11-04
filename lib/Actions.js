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
        WAIT_FOR_PAGE: 'waitForPage'
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

        return this.performActions(actions);
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
                .then(function () {
                    action.__done = true;
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
        debug('Perform action %o', action);
        var selector = (action.parentScope || parentSelector) + ' ' + action.scope;
        switch (action.type) {
            case this.TYPES.CLICK:
                return this.click(selector);

            case this.TYPES.WAIT:
                return this.waitElement(selector, action.timeout);

            case this.TYPES.TYPE:
                return this.type(selector, action.text);

            case this.TYPES.WAIT_FOR_PAGE:
                return this.waitForPage();

            default:
                var customAction = this._customActions[action.type];
                if (!customAction) {
                    return vow.reject(new Error('Unknown action type: ' + action.type));
                }

                return customAction.call(this, action);
        }
    },

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
        return this.wait(function (selector) {
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
        return this._env.evaluateJs(interval, function (interval) {
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
        return this._env.evaluateJs(selector, function (selector) {
            var nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].click();
            }

            return nodes.length;
        }).then(function (len) {
            debug('clicked %s nodes', len);
        });
    },

    type: function (selector, text) {
        debug('typing %s on %s', text, selector);
        return this._env.evaluateJs(selector, text, function (selector, text) {
            var nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].value = text;
            }

            return nodes.length;
        }).then(function (len) {
            debug('text types in %s nodes', len);
        });
    },

    waitForPage: function () {
        return this._env.waitForPage();
    }
};

module.exports = Actions;
