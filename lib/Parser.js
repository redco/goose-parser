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
 * @property {?(Grid|Collection)} collection
 * @property {?Array.<Transform>} transform
 * @property {?string} separator
 * @property {?string} type
 */

/**
 * @typedef {object} Action
 * @property {string} type
 * @property {?string} scope
 * @property {?string} parentScope
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
function Parser(options) {
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
        GRID: 'grid'
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
            });
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
     * @param {number} [offset]
     * @returns {Promise}
     * @private
     */
    _parseRootRule: function (offset) {
        offset = offset || 0;
        debug('Parsing root rule with offset: %s', offset);
        var rule = this._rules;
        this._pushScope(rule.scope, rule.parentScope);
        return this._actions
            .performForRule(rule, this._getSelector())
            .then(this._parseScope.bind(this, rule, offset))
            .then(function (results) {
                this._popScope();
                return results;
            }, this);
    },

    /**
     * Push scope for future execution
     * @param {string} scope
     * @param {string} parentScope
     * @private
     */
    _pushScope: function (scope, parentScope) {
        if (!scope) {
            throw new Error('Scope cannot be blank');
        }

        this._scopes.push({scope: scope, parentScope: parentScope});
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
        return this._actions
            .performForRule(rule, this._getSelector())
            .then(this._parseScope.bind(this, rule))
            .then(function (results) {
                this._popScope();
                return results;
            }, this);
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
     * @returns {Promise}
     * @private
     */
    _parseScope: function (rule, offset) {
        switch (this._getRuleType(rule)) {
            case this.TYPES.GRID:
                return this._parseGridRule(rule, offset);

            case this.TYPES.COLLECTION:
                return this._parseCollectionRule(rule);

            case this.TYPES.SIMPLE:
                return this._parseSimpleRule(rule);

            default:
                throw new Error('Unknown rule type for %', JSON.stringify(rule));
        }
    },

    /**
     * Get rule type
     * @param {Object} rule
     * @returns {string}
     */
    _getRuleType: function (rule) {
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
            .evaluateJs(this._getSelector(), function (selector) {
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
                    results[rule.name] = result;
                });
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
        rule.type = rule.type || 'string';
        debug('._parseSimpleRule() has called for selector %s', selector);
        return this._env.evaluateJs(selector, function (selector) {
            var nodes = Sizzle(selector);
            return Array.prototype.map.call(nodes, function (node) {
                return node.textContent;
            });
        }).then(function (results) {
            if (!results) {
                throw new Error('Error during querying selector: ' + selector);
            }

            debug('._parseSimpleRule() result %o', results);

            if (rule.type === 'string') {
                results = results.map(function (result) {
                    return result.trim();
                }).join(rule.separator || ' ');
                return this._transforms.produce(rule.transform, results);
            }

            return results.map(function (item) {
                return this._transforms.produce(rule.transform, item.trim());
            }, this);
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

                var offset = this._paginator.getType() === this._paginator.TYPES.SCROLL ? results.length : 0;

                return this._env
                    .snapshot('paginated.' + pagination.value)
                    .then(this._parseRootRule.bind(this, offset))
                    .then(function (pageResults) {
                        debug('Pagination results %o', pageResults);
                        Array.prototype.push.apply(results, pageResults);
                        return this._paginate(results);
                    }, this);

            }, this);

    }
};

module.exports = Parser;
