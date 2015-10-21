var debug = require('debug')('Actions'),
    vow = require('vow');

function Actions (options) {
    this._env = options.environment;
}

Actions.prototype = {
    TYPES: {
        CLICK: 'click',
        WAIT: 'wait'
    },

    performForRule: function (rule, parentSelector) {
        var actions = rule.actions;

        debug('Perform actions %o', actions);
        if (!actions) {
            return vow.resolve();
        }

        if (!Array.isArray(actions)) {
            throw new Error('actions must be an Array');
        }

        var self = this;
        return actions.reduce(function (promise, action) {
            return promise.then(self._performAction.bind(self, action, parentSelector));
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
        var selector = (action.parentScope || parentSelector) + ' ' +action.scope;
        switch (action.type) {
            case this.TYPES.CLICK:
                return this._env.evaluateJs(selector, function (selector) {
                    var nodes = Sizzle(selector);
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        nodes[i].click();
                    }

                    return nodes.length;
                }).then(function (len) {
                    debug('clicked %s nodes', len);
                }, this);

            case this.TYPES.WAIT:
                return this.waitElement(selector, action.timeout);

            default:
                return vow.reject(new Error('Unknown action type: ' + action.type));
        }
    },

    waitElement: function (selector, timeout, interval) {
        debug('._waitElement() ' + selector);
        return this.wait(function (selector) {
            return Sizzle(selector).length;
        }, function (foundElementsCount) {
            return !!foundElementsCount;
        }, [selector], timeout, interval);
    },

    wait: function (evalFunction, checkerFunction, args, timeout, interval) {
        var deferred = vow.defer();
        args = args || [];
        timeout = timeout || 5000;
        interval = interval || 50;
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

    scroll: function (interval) {
        debug('scroll %s px', interval);
        return this._env.evaluateJs(interval, function (interval) {
            document.body.scrollTop += interval;
        }, this);
    }
};

module.exports = Actions;
