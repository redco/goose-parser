'use strict';

var debug = require('debug')('Actions'),
    vow = require('vow'),
    _ = require('lodash');

function Actions (options) {
    this._env = options.environment;

    this._customActions = {};
    this._store = {
        'environment:options': this._env.getOptions()
    };
}

Actions.prototype = {
    TYPES: {
        CLICK: 'click',
        MOUSE_DOWN: 'mousedown',
        MOUSE_UP: 'mouseup',
        WAIT: 'wait',
        WAIT_FOR_VISIBLE: 'waitForVisible',
        WAIT_FOR_PATTERN: 'waitForPattern',
        WAIT_FOR_PAGE: 'waitForPage',
        WAIT_FOR_QUERY: 'waitForQuery',
        TYPE: 'type',
        CONDITION: 'conditionalActions',
        EXIST: 'exist',
        BACK: 'back',
        PROVIDE_COLLECTION: 'provideCollection',
        SNAPSHOT: 'snapshot',
        OPEN: 'open'
    },

    /**
     * Perform parsing rule
     * @param {Rule} rule
     * @param {string} parentSelector
     * @returns {Promise}
     */
    performForRule: function (rule, parentSelector) {
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

    _handleError: function (handlerDescription, actionArgs) {
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
    performPostActionsForRule: function (rule, parentSelector) {
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
                .then(function (previousActionResult) {
                    return self._performAction(action, parentSelector, previousActionResult);
                })
                .then(function (result) {
                    action.__done = true;
                    return result;
                });
        }, vow.resolve());
    },

    get: function (name) {
        return this._store[name];
    },

    set: function (name, value) {
        this._store[name] = value;
    },

    /**
     * @param {Action} action
     * @param {string} parentSelector
     * @param {*} previousActionResult
     * @returns {Promise}
     * @private
     */
    _performAction: function (action, parentSelector, previousActionResult) {
        var selector = (action.parentScope || parentSelector) + ' ' + (action.scope || '');
        debug('Perform action %o for generated selector %s', action, selector);

        var waitingForPage;
        if (action.waitForPage || action.type === this.TYPES.BACK) {
            waitingForPage = this.waitForPage(action.waitForPageTimeout);
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

        var actionPromise;
        switch (action.type) {
            case this.TYPES.CLICK:
                actionPromise = this.click(selector);
                break;

            case this.TYPES.MOUSE_DOWN:
                actionPromise = this.mousedown(selector);
                break;

            case this.TYPES.MOUSE_UP:
                actionPromise = this.mouseup(selector);
                break;

            case this.TYPES.WAIT:
                actionPromise = this.waitElement(selector, action.timeout);
                break;

            case this.TYPES.WAIT_FOR_VISIBLE:
                actionPromise = this.waitElementIsVisible(selector, action.timeout);
                break;

            case this.TYPES.WAIT_FOR_PATTERN:
                actionPromise = this.waitForPattern(selector, action.pattern, action.timeout);
                break;

            case this.TYPES.WAIT_FOR_PAGE:
                actionPromise = this.waitForPage(action.timeout);
                break;

            case this.TYPES.WAIT_FOR_QUERY:
                actionPromise = this.waitForQuery(action.uri, action.timeout);
                break;

            case this.TYPES.TYPE:
                actionPromise = this.type(selector, action.useActionsResult ? previousActionResult : action.text);
                break;

            case this.TYPES.CONDITION:
                actionPromise = this.performConditionalActions(selector, action.conditions, action.actions, action.elseActions);
                break;

            case this.TYPES.EXIST:
                actionPromise = this.exist(selector);
                break;

            case this.TYPES.BACK:
                actionPromise = this.back();
                break;

            case this.TYPES.PROVIDE_COLLECTION:
                debug('Providing collection %o', action.collection);
                actionPromise = vow.resolve(action.collection);
                break;

            case this.TYPES.SNAPSHOT:
                actionPromise = this._env.snapshot(action.name);
                break;

            case this.TYPES.OPEN:
                actionPromise = this.open(action.url);
                break;

            default:
                var customAction = this._customActions[action.type];
                if (!customAction) {
                    return vow.reject(new Error('Unknown action type: ' + action.type));
                }

                actionPromise = customAction.call(this, action);
                break;
        }

        if (action.set) {
            actionPromise = actionPromise.then(results => {
                this.set(action.set, results);
                return results;
            });
        }

        return vow.all([actionPromise, waitingForPage, waitingForQuery]).spread(function (result) {
            return casesPromise || result;
        });
    },

    _performCases: function (cases, parentSelector, previousActionResult) {
        debug('handle several cases in parallel %o', cases);

        var wonCase = null;
        var promises = cases.map(function (actions, caseNumber) {
            var beginningPromise = this._performAction(actions[0], parentSelector, previousActionResult);
            return actions
                .slice(1)
                .reduce(function (promise, action, i, array) {
                    return promise.then(function () {
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
                .then(function (results) {
                    if (wonCase === null) {
                        wonCase = caseNumber;
                        debug('Won case with actions %o', cases[wonCase]);
                    }
                    return results;
                }, function (reason) {
                    debug('Chain %o was reject with reason %s', actions, reason);
                    throw reason;
                });
        }, this);

        return vow.any(promises).then(function () {
            return promises[wonCase];
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
     * Wait for an element is on the page and visible
     * @param {string} selector
     * @param {number} [timeout]
     * @param {number} [interval]
     * @returns {Promise}
     */
    waitElementIsVisible: function (selector, timeout, interval) {
        debug('._waitElementIsVisible() ' + selector);
        return this.wait(/* @covignore */ function (selector) {
            var nodes = Array.prototype.slice.call(Sizzle(selector), 0);
            return nodes.some(function (node) {
                return node.offsetWidth !== 0 && node.offsetHeight !== 0;
            });
        }, function (visible) {
            return visible;
        }, [selector], timeout, interval);
    },

    /**
     * Wait for an element'c content matches pattern
     * @param {string} selector
     * @param {string} pattern
     * @param {number} [timeout]
     * @param {number} [interval]
     * @returns {Promise}
     */
    waitForPattern: function (selector, pattern, timeout, interval) {
        debug('._waitForPattern() %s on selector %s', pattern, selector);
        return this.wait(/* @covignore */ function (selector) {
            var nodes = Sizzle(selector);
            return nodes.length && nodes[0].textContent || '';
        }, function (text) {
            return text.match(pattern) !== null;
        }, [selector], timeout, interval);
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
    wait: function (evalFunction, checkerFunction, args, timeout, interval) {
        var deferred = vow.defer();
        args = args || [];
        timeout = timeout || 5000;
        interval = interval || 10;

        checkerFunction = checkerFunction || function (result) {
                return !!result
            };

        var errback = function (msg) {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            deferred.reject(new Error('Error during _wait with args ' + args.toString() + ': ' + msg));
        };

        var timeoutId = setTimeout(function () {
            this._env.removeErrback(errback);
            clearInterval(intervalId);
            deferred.reject(new Error('Timeout for _wait with arguments: ' + args.toString()));
        }.bind(this), timeout);

        this._env.addErrback(errback);

        var evalArgs = args.slice(0);
        evalArgs.push(evalFunction);
        var intervalId = setInterval(function () {
            this._env.evaluateJs
                .apply(this._env, evalArgs)
                .then(function () {
                    if (checkerFunction.apply(null, arguments)) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        this._env.removeErrback(errback);
                        deferred.resolve();
                    }
                }, this);
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
     * Perform mousedown on the element matched by selector
     * @param {string} selector
     * @returns {Promise}
     */
    mousedown: function (selector) {
        debug('mousedown on %s', selector);
        return this._env.mousedown(selector);
    },

    /**
     * Perform mouseup on the element matched by selector
     * @param {string} selector
     * @returns {Promise}
     */
    mouseup: function (selector) {
        debug('mouseup on %s', selector);
        return this._env.mouseup(selector);
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
     * Wait for query which match specified URI happens
     * @param {string} uri
     * @param {number} [timeout]
     * @returns {Promise}
     */
    waitForQuery: function (uri, timeout) {
        return this._env.waitForQuery(uri, timeout);
    },

    /**
     * Check conditional action
     * @param {string} selector
     * @param {Array} conditions
     * @param {Array} actions
     * @param {Array} [elseActions]
     * @returns {Promise}
     */
    performConditionalActions: function (selector, conditions, actions, elseActions) {
        return this
            .performActions(conditions, selector)
            .then(function (result) {
                if (!result) {
                    debug('Conditional actions failed with result %s, skip %o', result, actions);
                    return elseActions ? this.performActions(elseActions, selector) : false;
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
    },

    /**
     * Navigates to previous page
     */
    back: function () {
        return this._env.back();
    },

    /**
     * Opens a page
     * @param {string} url
     * @returns {Promise}
     */
    open: function (url) {
        return this._env.evaluateJs(url, function (url) {
            window.location = url;
        });
    }
};

module.exports = Actions;
