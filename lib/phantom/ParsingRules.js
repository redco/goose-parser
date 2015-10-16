var debugLib = require('debug'),
    debug = debugLib('ParsingRules'),
    _ = require('lodash'),
    vow = require('vow'),
    moment = require('moment');

function ParsingRules(options) {
    this._rules = options.rules;
    this._scopes = [];
    this._parser = options.parser;
}

Object.assign(ParsingRules.prototype, /**@lends ParsingRules#*/{
    TYPES: {
        RULE: {
            SIMPLE: 'simple',
            COLLECTION: 'collection',
            GRID: 'grid'
        },
        ACTION: {
            CLICK: 'click',
            WAIT: 'wait'
        },
        EVENT: {
            BEFORE_SCRAPING: 'before',
            AFTER_SCRAPING: 'after'
        },
        TRANSFORM: {
            DATE: 'date',
            REPLACE: 'replace'
        }
    },

    processRootRule: function (offset) {
        var rule = this._rules;
        this._scopes.push(rule.scope);
        return this
            ._parseGridRule(rule, offset)
            .then(function (results) {
                this._scopes.pop();
                return results;
            }, this);
    },

    /**
     * @param {object} rule
     * @returns {Promise}
     */
    processRule: function (rule) {
        debug('Process rule %o', rule);
        this._scopes.push(rule.scope);
        return this.performActions(rule)
            .then(this.parseScope.bind(this, rule))
            .then(function (results) {
                this._scopes.pop();
                return results;
            }, this);
    },

    performActions: function (rule) {
        debug('Perform actions %o', rule.actions);
        if (!rule.actions) {
            return vow.resolve();
        }

        if (!Array.isArray(rule.actions)) {
            throw new Error('actions must be an Array');
        }

        var self = this;
        return rule.actions.reduce(function (promise, action) {
            return promise.then(self.performAction.bind(self, action));
        }, vow.resolve());
    },

    performAction: function (action) {
        debug('Perform action %o', action);
        switch (action.type) {
            case this.TYPES.ACTION.CLICK:
                this._scopes.push(action.scope);
                return this._parser.evaluateInPhantom(this._getSelector(), function (selector) {
                    var nodes = Sizzle(selector);
                    for (var i = 0, l = nodes.length; i < l; i++) {
                        nodes[i].click();
                    }

                    return nodes.length;
                }).then(function (len) {
                    this._scopes.pop();
                    debug('clicked %s nodes', len);
                }, this);

            case this.TYPES.ACTION.WAIT:
                this._scopes.push(action.scope);
                return this._parser.wait(this._getSelector()).then(function () {
                    this._scopes.pop();
                }, this);

            default:
                return vow.reject(new Error('Unknown action type: ' + action.type));
        }
    },

    _getSelector: function () {
        var selector = this._scopes.join(' ');
        debug('._getSelector() generates %s', selector);
        return selector;
    },

    parseScope: function (rule) {
        debug('.parseScope()');
        switch (this.getRuleType(rule)) {
            case this.TYPES.RULE.GRID:
                return this._parseGridRule(rule);

            case this.TYPES.RULE.COLLECTION:
                return this._parseCollectionRule(rule);

            case this.TYPES.RULE.SIMPLE:
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
    getRuleType: function (rule) {
        debug('.getRuleType()');
        var isCollection = !!rule.collection;

        if (isCollection) {
            if (Array.isArray(rule.collection[0])) {
                return this.TYPES.RULE.GRID;
            }

            if (_.isPlainObject(rule.collection[0])) {
                return this.TYPES.RULE.COLLECTION;
            }
        }

        return this.TYPES.RULE.SIMPLE;
    },

    _parseGridRule: function (rule, offset) {
        debug('._parseGridRule() has called');
        offset = offset || 0;
        var collection = rule.collection[0];
        return this._parser.evaluateInPhantom(this._getSelector(), function (selector) {
            return Sizzle(selector).length;
        }).then(function (nodesCount) {
            var scope = this._scopes.pop();
            return this
                ._parseRow(collection, nodesCount - 1 - offset, offset, scope, [])
                .then(function (results) {
                    this._scopes.push(scope);
                    return results;
                }, this);
        }, this).then(function (results) {
            debug('._parseGridRule() results %o', results);
            return results;
        });
    },

    _parseRow: function (collection, nodesCount, nodeIndex, scope, results) {
        debug('._parseRow() has called for %s.eq(%s)', scope, nodeIndex);
        this._scopes.push(scope + ':eq(' + nodeIndex + ')');
        return this
            ._parseCollectionRule({
                collection: collection
            })
            .then(function (result) {
                results.push(result);
                this._scopes.pop();

                nodesCount--;
                if (nodesCount >= 0) {
                    return this._parseRow(collection, nodesCount, ++nodeIndex, scope, results);
                }

                return results;
            }, this)
    },

    _parseCollectionRule: function (rule) {
        debug('._parseCollectionRule() has called for rule %s', rule);

        var self = this,
            collection = rule.collection,
            results = {};
        return collection.reduce(function (promise, rule) {
            return promise
                .then(self.processRule.bind(self, rule))
                .then(function (result) {
                    results[rule.name] = result;
                });
        }, vow.resolve()).then(function () {
            debug('._parseCollectionRule() result %o', results);
            return results;
        });
    },

    _parseSimpleRule: function (rule) {
        var selector = this._getSelector();
        debug('._parseSimpleRule() has called for selector %s', selector);
        return this._parser.evaluateInPhantom(selector, function (selector) {
            var nodes = Sizzle(selector);
            return Array.prototype.map.call(nodes, function (node) {
                return node.textContent;
            });
        }).then(function (results) {
            if (!results) {
                throw new Error('Error during querying selector: ' + selector);
            }

            debug('._parseSimpleRule() result %o', results);
            return results.map(function (result) {
                return result.trim();
            }).join(rule.separator || ' ');
        }).then(this._transformSimpleResult.bind(this, rule));
    },

    _transformSimpleResult: function (rule, result) {
        debug('._transformSimpleResult() has called for %o', rule.transform);
        return (rule.transform || []).reduce(function (result, transformationStep) {
            switch (transformationStep.type) {
                case this.TYPES.TRANSFORM.DATE:
                    return moment(result, transformationStep.from, transformationStep.locale || 'en')
                        .format(transformationStep.to);

                case this.TYPES.TRANSFORM.REPLACE:
                    var re = transformationStep.re;
                    return result.replace(RegExp.apply(null, re), transformationStep.to);

                default:
                    throw new Error('Unsupported transformation type: ' + transformationStep.type);
            }
        }.bind(this), result);
    }
});

module.exports = ParsingRules;
