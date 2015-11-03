var debug = require('debug')('Actions'),
    vow = require('vow');

function Actions(options) {
    this._env = options.environment;
}

Actions.prototype = {
    TYPES: {
        CLICK: 'click',
        WAIT: 'wait'
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

        if (!Array.isArray(actions)) {
            throw new Error('actions must be an Array');
        }

        debug('Perform actions %o', actions);

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

            default:
                return vow.reject(new Error('Unknown action type: ' + action.type));
        }
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
    }
};

module.exports = Actions;
