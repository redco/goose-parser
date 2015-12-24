'use strict';

var debugLib = require('debug'),
    debug = debugLib('Parser'),
    _ = require('lodash'),
    vow = require('vow'),
    Paginator = require('./Paginator'),
    Actions = require('./Actions'),
    Transformations = require('./Transformations');

/**
 * @typedef {object} Rule
 * @property {?string} scope
 * @property {?string} parentScope
 * @property {string} name
 * @property {?Array.<Action>} actions
 * @property {?Array.<Action>} postActions
 * @property {?(Grid|Collection)} collection
 * @property {?Array.<Transform>} transform
 * @property {?boolean} collectionFromActions
 * @property {?string} separator
 * @property {?string} type
 * @property {?string} attr
 * @property {?boolean|Function} id
 */

/**
 * @typedef {object} Action
 * @property {string} type
 * @property {?string} scope
 * @property {?string} parentScope
 * @property {?boolean} waitForPage
 * @property {?number} waitForPageTimeout
 * @property {?boolean} once
 * @property {?boolean} __done - set after action was performed first time
 */

/**
 * @typedef {Action} WaitAction
 * @property {?number} timeout
 */

/**
 * @typedef {Action} ClickAction
 */

/**
 * @typedef {Array.<Rule>} Collection
 */

/**
 * @typedef {Array.<Array.<Rule>>} Grid
 */

/**
 * @typedef {object} Transform
 * @property {string} type
 */

/**
 * type=date
 * @typedef {Transform} DateTransform
 * @property {?string} locale
 * @property {string} from - date format for parsing
 * @property {string} to - desired date format
 */

/**
 * type=replace
 * @typedef {Transform} ReplaceTransform
 * @property {?string} locale
 * @property {Array.<string>} re - args for RegExp
 * @property {string} to - string to replace to
 */

/**
 * @param {object} options
 * @param {Environment} options.environment
 * @param {object} options.pagination
 * @constructor
 */
function Parser (options) {
    this._env = options.environment;
    this._scopes = [];

    /**
     * @type {?Rule}
     * @private
     */
    this._rules = null;

    /**
     * @type {Paginator}
     * @private
     */
    this._paginator = null;

    /**
     * @type {Array}
     * @private
     */
    this._preActions = null;

    this._actions = new Actions({
        environment: this._env
    });

    if (options.pagination) {
        var paginationOptions = _.clone(options.pagination);
        paginationOptions.actions = this._actions;
        paginationOptions.environment = this._env;
        this._paginator = new Paginator(paginationOptions);
    }

    this._transforms = new Transformations;
}

Parser.prototype = {
    constructor: Parser,

    TYPES: {
        SIMPLE: 'simple',
        COLLECTION: 'collection',
        GRID: 'grid',
        ACTIONS_RESULT: 'actionsResult',
        GET: 'get'
    },

    /**
     * @param {object} options
     * @param {Rule} options.rules
     * @param {Array} [options.actions]
     * @returns {Promise}
     */
    parse: function (options) {
        debug('.parse() has called');
        this._rules = options.rules;
        this._preActions = options.actions || null;
        this._paginator && this._paginator.reset();
        var results;
        return this._env.prepare()
            .then(function () {
                if (this._preActions != undefined) {
                    return this._actions.performActions(this._preActions);
                }
                return vow.resolve();
            }, this)
            .then(this._env.snapshot.bind(this._env, 'before_parse'))
            .then(this._parseRootRule, this)
            .then(function (parsedResults) {
                results = parsedResults;
                return results;
            })
            .then(this._paginate, this)
            .then(this._env.tearDown, this._env)
            .then(function () {
                debug('Parsed %s rows', results.length);
                return results;
            }, function (e) {
                debug('Parsing failed, saving partial results');
                this._partialResults = results;
                throw e;
            }, this);
    },

    getPartialResults: function () {
        return this._partialResults;
    },

    /**
     * @see {@link Actions#addAction}
     */
    addAction: function () {
        return this._actions.addAction.apply(this._actions, arguments)
    },

    /**
     * @see {@link Transformations#addTransformation}
     */
    addTransformation: function () {
        return this._transforms.addTransformation.apply(this._transforms, arguments)
    },

    /**
     * @see {@link Paginator#addPagination}
     */
    addPagination: function () {
        return this._paginator.addPagination.apply(this._paginator, arguments)
    },

    /**
     * @param {number} [offset]
     * @returns {Promise}
     * @private
     */
    _parseRootRule: function (offset) {
        offset = offset || 0;
        debug('Parsing root rule with offset: %s', offset);
        var rule = this._rules;
        this._pushScope(rule.scope, rule.parentScope);
        var selector = this._getSelector();
        var parseResults;
        return this._actions
            .performForRule(rule, selector)
            .then(function (actionsResults) {
                return this._parseScope(rule, offset, actionsResults);
            }, this)
            .then(function (results) {
                parseResults = results;
            })
            .then(this._actions.performPostActionsForRule.bind(this._actions, rule, selector))
            .then(this._popScope, this)
            .then(function () {
                return parseResults;
            });
    },

    /**
     * Push scope for future execution
     * @param {string} scope
     * @param {string} parentScope
     * @private
     */
    _pushScope: function (scope, parentScope) {
        this._scopes.push({scope: scope || '', parentScope: parentScope});
    },

    /**
     * Pop scope
     * @returns {Object}
     * @private
     */
    _popScope: function () {
        return this._scopes.pop();
    },

    /**
     * @param {Rule} rule
     * @returns {Promise}
     */
    _processRule: function (rule) {
        debug('Process rule %o', rule);
        this._pushScope(rule.scope, rule.parentScope);
        var selector = this._getSelector();
        var parseResults;

        return this._actions
            .performForRule(rule, selector)
            .then(function (actionsResults) {
                return this._parseScope(rule, null, actionsResults);
            }, this)
            .then(function (results) {
                parseResults = results;
            })
            .then(this._actions.performPostActionsForRule.bind(this._actions, rule, selector))
            .then(this._popScope, this)
            .then(function () {
                return parseResults;
            });
    },

    /**
     * Get current parsing selector
     * @returns {string}
     * @private
     */
    _getSelector: function () {
        var scopes = this._scopes,
            selector = [];
        for (var i = scopes.length - 1; i >= 0; i--) {
            var scope = scopes[i];
            selector.unshift(scope.scope);

            if (scope.parentScope) {
                selector.unshift(scope.parentScope);
                break;
            }
        }

        return selector.join(' ');
    },

    /**
     * Parse a scope
     * @param {Rule} rule parsing rule
     * @param {number} [offset] offset for GridRule
     * @param {*} [actionsResults]
     * @returns {Promise}
     * @private
     */
    _parseScope: function (rule, offset, actionsResults) {
        if (rule.collectionFromActions) {
            rule.collection = actionsResults;
        }

        let resultsPromise;
        const ruleType = this._getRuleType(rule);
        switch (ruleType) {
            case this.TYPES.ACTIONS_RESULT:
                resultsPromise = actionsResults;
                break;

            case this.TYPES.GET:
                resultsPromise = vow.cast(this._actions.get(rule.get));
                break;

            case this.TYPES.GRID:
                resultsPromise = this._parseGridRule(rule, offset);
                break;

            case this.TYPES.COLLECTION:
                resultsPromise = this._parseCollectionRule(rule);
                break;

            case this.TYPES.SIMPLE:
                resultsPromise = this._parseSimpleRule(rule);
                break;
        }

        const format = results => {
            if (ruleType === this.TYPES.SIMPLE && rule.type !== 'array') {
                return results.join(rule.separator || ' ');
            }

            return results;
        };

        if (!rule.transform) {
            return resultsPromise.then(format);
        }

        return resultsPromise.then(results => {
            if (Array.isArray(results)) {
                results = results.map(function (result) {
                    if (typeof result === 'string') {
                        result = result.trim();
                    }
                    return this._transforms.produce(rule.transform, result);
                }, this);

                return format(results);
            }

            return this._transforms.produce(rule.transform, results);
        });
    },

    /**
     * Get rule type
     * @param {Object} rule
     * @returns {string}
     */
    _getRuleType: function (rule) {
        if (rule.useActionsResult) {
            return this.TYPES.ACTIONS_RESULT;
        }

        if (rule.get) {
            return this.TYPES.GET;
        }

        var isCollection = !!rule.collection;

        if (isCollection) {
            if (Array.isArray(rule.collection[0])) {
                return this.TYPES.GRID;
            }

            if (_.isPlainObject(rule.collection[0])) {
                return this.TYPES.COLLECTION;
            }
        }

        return this.TYPES.SIMPLE;
    },

    /**
     * Parse Grid rule
     * @param {Rule} rule
     * @param {number} [offset]
     * @returns {Promise}
     * @private
     */
    _parseGridRule: function (rule, offset) {
        debug('._parseGridRule() has called');
        offset = offset || 0;
        var collection = rule.collection[0];
        return this._env
            .evaluateJs(this._getSelector(), /* @covignore */ function (selector) {
                return Sizzle(selector).length;
            })
            .then(function (nodesCount) {
                debug('parsing %s nodes', nodesCount);
                var scope = this._popScope();
                return this
                    ._parseRow({
                        collection: collection,
                        nodesCount: nodesCount - 1 - offset,
                        offset: offset,
                        scope: scope,
                        results: []
                    })
                    .then(function (results) {
                        this._pushScope(scope.scope, scope.parentScope);
                        return results;
                    }, this);
            }, this)
            .then(function (results) {
                debug('._parseGridRule() results %o', results);
                return results;
            });
    },

    /**
     * Parse row of Grid rule
     * @param {object} options
     * @returns {Promise}
     * @private
     */
    _parseRow: function (options) {
        var selector = options.scope.scope + ':eq(' + options.offset + ')';
        debug('._parseRow() has called for %s', selector);
        this._pushScope(selector, options.scope.parentScope);

        return this
            ._parseCollectionRule({
                collection: options.collection
            })
            .then(function (result) {
                options.results.push(result);
                this._popScope();

                options.nodesCount--;
                if (options.nodesCount >= 0) {
                    options.offset++;
                    return this._parseRow(options);
                }

                return options.results;
            }, this)
    },

    /**
     * Parse Collection rule
     * @param {Rule} rule
     * @returns {Promise}
     * @private
     */
    _parseCollectionRule: function (rule) {
        debug('._parseCollectionRule() has called for rule %o', rule);

        var self = this,
            collection = rule.collection,
            results = {};
        return collection.reduce(function (promise, rule) {
            return promise
                .then(self._processRule.bind(self, rule))
                .then(function (result) {
                    var name;
                    switch (typeof rule.id) {
                        case 'boolean':
                            name = '_id';
                            break;
                        case 'function':
                            name = '_id';
                            result = rule.id.call(this, rule, result);
                            break;
                        default:
                            name = rule.name;
                    }
                    results[name] = result;
                }, self);
        }, vow.resolve()).then(function () {
            debug('._parseCollectionRule() result %o', results);
            return results;
        });
    },

    /**
     * Parse simple rule
     * @param {Rule} rule
     * @returns {Promise}
     * @private
     */
    _parseSimpleRule: function (rule) {
        var selector = this._getSelector();
        var attr = rule.attr || null;
        debug('._parseSimpleRule() has called for selector %s', selector);
        return this._env.evaluateJs(selector, attr, /* @covignore */ function (selector, attr) {
            var nodes = Sizzle(selector);
            return nodes.map(function (node) {
                return attr !== null ? node.getAttribute(attr) : node.textContent;
            });
        }).then(function (results) {
            if (!results) {
                throw new Error('Error during querying selector: ' + selector);
            }

            debug('._parseSimpleRule() result %o', results);
            return results;
        }, this);
    },

    _paginate: function (results) {
        if (!this._paginator) {
            return vow.resolve(results);
        }

        debug('Pagination...');
        return this._paginator
            .paginate()
            .then(function (pagination) {
                if (pagination.done) {
                    return vow.resolve(results);
                }

                var offset = this._paginator.resetCollectionOffsetOnNewPage() ? 0 : results.length;

                return this._env
                    .snapshot('paginated.' + pagination.value)
                    .then(this._parseRootRule.bind(this, offset))
                    .then(function (pageResults) {
                        debug('Pagination results %o', pageResults);
                        Array.prototype.push.apply(results, pageResults);
                        var maxResults = this._paginator.getMaxResultsCount() - 1;
                        if (results.length > maxResults) {
                            results = results.slice(0, maxResults);
                            return vow.resolve(results);
                        }
                        return this._paginate(results);
                    }, this);

            }, this);

    }
};

module.exports = Parser;
