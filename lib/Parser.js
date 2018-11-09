const debugLib = require('debug');
const debug = debugLib('Parser');
const clone = require('lodash.clone');
const Actions = require('./Actions');
const Transforms = require('./Transforms');
const Storage = require('./Storage');
const Scope = require('./Scope');
const MAX_MILESTONE_ATTEMPTS = 2;

/**
 * @typedef {object} Rule
 * @property {?string} scope
 * @property {?string} parentScope
 * @property {?string} jsScope
 * @property {?string} jsParentScope
 * @property {string} name
 * @property {?Array.<ActionOptions>} actions
 * @property {?Array.<ActionOptions>} postActions
 * @property {?(Grid|Collection)} collection
 * @property {?Array.<TransformOptions>} transform
 * @property {?boolean} rulesFromActions
 * @property {?string} separator
 * @property {?string} type
 * @property {?string} attr
 * @property {?string} prop
 * @property {?number} child
 * @property {?boolean|Function} id
 * @property {?boolean} inject
 * @property {?number} injectionTimeout
 * @property {?object} catchError
 * @property {string} get
 * @property {string} set
 * @property {string} add
 * @property {string} unset
 * @property {*} value
 *
 */

/**
 * @typedef {object} ActionOptions
 * @property {string} type
 * @property {?string} scope
 * @property {?string} parentScope
 * @property {?string} jsScope
 * @property {?string} jsParentScope
 * @property {?object} waitFor
 * @property {string} waitFor.type
 * @property {?object} waitForQuery
 * @property {string} waitForQuery.uri pattern of uri which will be awaiting
 * @property {string} waitForQuery.timeout
 * @property {?boolean} waitForPage
 * @property {?number} waitForPageTimeout
 * @property {?boolean} once
 * @property {?boolean} __done - set after action was performed first time
 * @property {?Array.<ActionOptions>} cases
 * @property {?Array.<ActionOptions>} conditions
 * @property {?Array.<TransformOptions>} transform
 * @property {?string} set
 * @property {?object} change
 * @property {?boolean} useActionsResult
 */

/**
 * @typedef {ActionOptions} WaitAction
 * @property {?number} timeout
 */

/**
 * @typedef {Array.<Rule>} Collection
 */

/**
 * @typedef {Array.<Array.<Rule>>} Grid
 */

/**
 * @typedef {object} TransformOptions
 * @property {string} type
 */

/**
 * type=date
 * @typedef {TransformOptions} DateTransform
 * @property {?string} locale
 * @property {string} from - date format for parsing
 * @property {string} to - desired date format
 */

/**
 * type=replace
 * @typedef {TransformOptions} ReplaceTransform
 * @property {?string} locale
 * @property {Array.<string>} re - args for RegExp
 * @property {string} to - string to replace to
 */

const RULE_TYPE = {
    SIMPLE: 'simple',
    COLLECTION: 'collection',
    GRID: 'grid',
    ACTIONS_RESULT: 'actionsResult',
    GET: 'get',
    VALUE: 'value',
    INJECTION: 'injection'
};

const PARSING_MODE = {
    SINGLE: 'single',
    MULTIPLE: 'multiple',
};

class Parser {
    /**
     * @param {object} options
     * @param {AbstractEnvironment} options.environment
     * @param {?Paginator} options.paginator
     * @param {?boolean} options.clearDom
     */
    constructor(options) {
        if (!options.environment) {
            throw new Error('\'environment\' should be specified');
        }

        this._env = options.environment;
        this._paginator = options.paginator;
        this.clearDom = options.clearDom || false;
        this.mode = options.mode || 'single';
        this._domScope = new Scope();
        this._jsScope = new Scope();

        /**
         * @type {?Rule}
         * @private
         */
        this._rules = null;

        /**
         * @type {Array}
         * @private
         */
        this._preActions = null;

        this._storage = new Storage({
            'environment:options': this._env.getOptions()
        });

        this._actions = new Actions({
            environment: this._env,
            parser: this,
            storage: this._storage
        });

        if (this._paginator) {
            this._paginator
                .setEnvironment(this._env)
                .setActions(this._actions);
        }

        this._transforms = new Transforms({storage: this._storage});
    }

    /**
     * @param {object} options
     * @param {Rule} options.rules
     * @param {String} options.url
     * @param {Array.<ActionOptions>} options.actions
     * @param {Array.<TransformOptions>} options.transform
     * @returns {Promise}
     */
    async parse(options = {}) {
        debug('.parse() has called');
        this._rules = options.rules || {};
        this._preActions = options.actions || null;

        let results;

        try {
            await this._env.prepare();
            if (this.mode === PARSING_MODE.MULTIPLE && options.url) {
                await this._env.goto(options.url);
            }

            if (this._paginator) {
                this._paginator.reset();
            }

            if (this._preActions) {
                await this._actions.performActions(this._preActions);
            }

            results = await this._parseRootRule();

            if (options.transform) {
                results = this._transforms.produce(options.transform, results);
            }

            if (this._paginator) {
                results = await this._paginate(results);
            }
            if (this.mode === PARSING_MODE.SINGLE) {
                await this.finish();
            }
        } catch (e) {
            await this.finish();
            throw e;
        }

        return results;
    }

    async finish() {
        try {
            await this._env.tearDown();
        } catch (e) {
            try {
                await this._env.snapshot('error');
                await this._env.tearDown();
            } catch (snapshotError) {
                await this._env.tearDown();
            }
            throw e;
        }
    }

    async moveYourFeet(stages) {
        debug('Hit the road!');
        const milestones = stages.milestones;
        const edgeCases = stages.edgeCases;

        try {
            await this._env.prepare();
            await milestones.reduce(async (promise, milestone) => {
                await promise;
                return this.passMilestone(milestone, edgeCases);
            }, Promise.resolve());

            await this._env.tearDown();
        } catch (e) {
            await this._env.snapshot('error');
            this._env.tearDown();
            throw e;
        }
    }

    async passMilestone(milestone, edgeCases, attemptNumber) {
        attemptNumber = attemptNumber || 0;
        debug('Passing %o milestone, attempt #%s', milestone, attemptNumber);

        try {
            const result = await this._actions.performActions(milestone.condition);
            if (!result) {
                debug('Milestone condition failed');
                return this.catchFailedMilestone(milestone, edgeCases, attemptNumber, 'Milestone condition failed');
            }

            debug('Milestone condition passed, passing milestone');
            return this.processRule(milestone.rules, 0);
        } catch (e) {
            debug('Caught milestone error %o', e.stack || e);
            return this.catchFailedMilestone(milestone, edgeCases, attemptNumber, e);
        }
    }

    async catchFailedMilestone(milestone, edgeCases, attemptNumber, originalError) {
        debug('Catching failing milestone');
        if (attemptNumber > MAX_MILESTONE_ATTEMPTS) {
            throw new Error(`Milestone failed more than ${MAX_MILESTONE_ATTEMPTS} times, original error: ${originalError.stack || originalError}`);
        }

        const edgeCasesHandled = await this.handleEdgeCases(edgeCases);
        if (!edgeCasesHandled) {
            debug('Catching edge cases failed');
            return this.catchFailedMilestone(milestone, edgeCases, attemptNumber + 1, originalError);
        }

        debug('Edge case handled, another try to pass milestone');
        return this.passMilestone(milestone, edgeCases, attemptNumber + 1);
    }

    async handleEdgeCases(edgeCases) {
        return edgeCases.reduce(async (promise, edgeCase) => {
            const result = await promise;
            if (result) {
                return Promise.resolve(result);
            }

            return this.handleEdgeCase(edgeCase);
        }, Promise.resolve(false));
    }

    async handleEdgeCase(edgeCase) {
        debug('Handling edge case %o', edgeCase);

        try {
            const result = await this._actions.performActions(edgeCase.condition);
            if (!result) {
                debug('Edge case condition failed');
                return false;
            }

            debug('Edge case condition is true, trying to handle the case');
            return this.processRule(edgeCase.rules, 0);
        } catch (e) {
            debug('Caught edge case error %o', e.stack || e);
            return false;
        }
    }

    /**
     * @see {@link Actions#addAction}
     */
    addAction(type, action) {
        return this._actions.addAction(type, action);
    }

    /**
     * @see {@link Transforms#addTransform}
     */
    addTransform(type, transform) {
        return this._transforms.addTransform(type, transform)
    }

    /**
     * @param {number} [offset]
     * @returns {Promise}
     * @private
     */
    async _parseRootRule(offset) {
        offset = offset || 0;
        debug('Parsing root rule with offset: %s', offset);
        return this.processRule(this._rules, offset);
    }

    /**
     * @param {Rule} rule
     * @param {number} [offset]
     * @returns {Promise}
     */
    async processRule(rule, offset) {
        debug('Process rule %o', rule);
        let scopePushed = false;
        let jsScopePushed = false;
        if (rule.jsScope) {
            this._jsScope.push(rule.jsScope, rule.jsParentScope);
            jsScopePushed = true;
        }
        if (rule.scope) {
            this._domScope.push(rule.scope, rule.parentScope);
            scopePushed = true;
        }
        const domSelector = this._domScope.getSelector();

        const actionsResult = await this._actions.performForRule(rule, domSelector);
        let actionsScopePushed = false;
        let actionsJsScopePushed = false;
        if (rule.rulesFromActions) {
            if (!actionsResult) {
                throw new Error('Rule node marked with "rulesFromActions" flag should return rules from action. Got nothing.');
            }
            debug('Rules extracted from action %o', rule);
            // use child transform or parent transform or nothing
            actionsResult.transform = actionsResult.transform || rule.transform || false;
            if (!('inject' in actionsResult)) {
                actionsResult.inject = rule.inject;
            }
            if ('scope' in actionsResult) {
                this._domScope.push(actionsResult.scope, actionsResult.parentScope);
                actionsScopePushed = true;
            }
            if ('jsScope' in actionsResult) {
                this._jsScope.push(actionsResult.jsScope, actionsResult.jsParentScope);
                actionsJsScopePushed = true;
            }

            rule = actionsResult;

            if ('actions' in rule) {
                await this._actions.performForRule(rule, domSelector);
            }
        }

        const results = await this._parseScope(rule, offset, actionsResult);

        if (actionsScopePushed) {
            this._domScope.pop();
        }
        if (actionsJsScopePushed) {
            this._jsScope.pop();
        }

        await this._actions.performPostActionsForRule.bind(this._actions, rule, domSelector);

        if (scopePushed) {
            this._domScope.pop();
        }
        if (jsScopePushed) {
            this._jsScope.pop();
        }

        return results;
    }

    /**
     * Parse a scope
     * @param {Rule} rule parsing rule
     * @param {number} [offset] offset for GridRule
     * @param {*} [actionsResults]
     * @returns {Promise}
     * @private
     */
    async _parseScope(rule, offset, actionsResults) {
        let results;
        const ruleType = this._getRuleType(rule);
        debug('Parse %s rule', ruleType);
        switch (ruleType) {
            case RULE_TYPE.ACTIONS_RESULT:
                results = actionsResults;
                break;

            case RULE_TYPE.GET:
                results = this._actions.get(rule.get);
                break;

            case RULE_TYPE.VALUE:
                results = rule.value;
                break;

            case RULE_TYPE.GRID:
                results = await this._parseGridRule(rule, offset);
                break;

            case RULE_TYPE.COLLECTION:
                results = await this._parseCollectionRule(rule);
                break;

            case RULE_TYPE.SIMPLE:
                results = await this._parseSimpleRule(rule);
                break;

            case RULE_TYPE.INJECTION:
                results = await this._injectBrowserRule(rule, offset, actionsResults);
                break;
        }

        const extract = (results, ruleType, dataType) => {
            if (
                ruleType === RULE_TYPE.SIMPLE &&
                dataType === 'array' &&
                Array.isArray(results) &&
                results.length === 1 &&
                Array.isArray(results[0])
            ) {
                debug('Extracted %o', results[0]);
                return results[0];
            }

            return results;
        };

        const format = results => {
            if ([RULE_TYPE.SIMPLE, RULE_TYPE.GET, RULE_TYPE.VALUE, RULE_TYPE.COLLECTION].includes(ruleType)) {
                if (Array.isArray(results) && rule.type !== 'array') {
                    return results.length === 1 ? results[0] : results.join(rule.separator || ' ');
                }
                if (!Array.isArray(results) && rule.type === 'array') {
                    return [results];
                }
            }

            return results;
        };

        const updateResultsInStore = results => {
            if (rule.set) {
                this._actions.set(rule.set, results);
            }
            if (rule.add) {
                const current = this._actions.get(rule.add) || [];
                current.push(results);
                this._actions.set(rule.add, current);
            }
            if (rule.unset) {
                this._actions.unset(rule.unset);
            }
            return results;
        };

        if (!rule.transform) {
            results = format(results);
            return updateResultsInStore(results);
        }

        results = format(this.transform(results, rule.transform));
        results = extract(results, ruleType, rule.type);
        return updateResultsInStore(results);
    }

    /**
     * Perform transformation on results
     * @param results
     * @param transform
     * @returns {*}
     */
    transform(results, transform) {
        if (Array.isArray(results)) {
            results = results.map((result) => {
                if (typeof result === 'string') {
                    result = result.trim();
                }
                return this._transforms.produce(transform, result);
            }, this);
        } else {
            results = this._transforms.produce(transform, results);
        }

        return results;
    }

    /**
     * Get rule type
     * @param {Object} rule
     * @returns {string}
     */
    _getRuleType(rule) {
        if (rule.inject) {
            return RULE_TYPE.INJECTION;
        }

        if (rule.useActionsResult) {
            return RULE_TYPE.ACTIONS_RESULT;
        }

        if (rule.get) {
            return RULE_TYPE.GET;
        }

        if (typeof rule.value !== 'undefined') {
            return RULE_TYPE.VALUE;
        }

        const isCollection = Array.isArray(rule.collection);
        if (isCollection) {
            if (Array.isArray(rule.collection[0])) {
                return RULE_TYPE.GRID;
            }

            return RULE_TYPE.COLLECTION;
        }

        return RULE_TYPE.SIMPLE;
    }

    /**
     * Parse Grid rule
     * @param {Rule} rule
     * @param {number} [offset]
     * @returns {Promise}
     * @private
     */
    async _parseGridRule(rule, offset) {
        debug('._parseGridRule() has called');
        offset = offset || 0;
        const maxItems = rule.maxItems || null;
        const collection = rule.collection[0];
        let nodesCount = await this._env.evaluateJs(
            this._domScope.getSelector(),
            this._jsScope.getSelector(),
            /* @covignore */ function(domSelector, jsSelector) {
                var domResult = domSelector && Sizzle(domSelector).length;
                if (domSelector) {
                    return domResult;
                }
                var jsObject = jsSelector && eval(jsSelector);
                if (jsObject && Array.isArray(jsObject)) {
                    return jsObject.length;
                }
            });
        if (!nodesCount) {
            return [];
        }
        if (maxItems && nodesCount > maxItems) {
            nodesCount = maxItems;
        }
        debug('parsing %s nodes', nodesCount);

        const scope = this._domScope.pop();
        const jsScope = this._jsScope.pop();
        const results = await this._parseRow({
            collection: collection,
            nodesCount: nodesCount - 1 - offset,
            offset: offset,
            scope: scope,
            jsScope: jsScope,
            results: []
        });
        if (scope) {
            this._domScope.push(scope.scope, scope.parentScope);
        }
        if (jsScope) {
            this._jsScope.push(jsScope.scope, jsScope.parentScope);
        }

        debug('._parseGridRule() results %o', results);
        return results;
    }

    /**
     * Parse row of Grid rule
     * @param {object} options
     * @returns {Promise}
     * @private
     */
    async _parseRow(options) {
        const {scope, jsScope} = options;
        const domSelector = scope ? scope.scope + ':eq(' + options.offset + ')' : null;
        const jsSelector = jsScope ? jsScope.scope + '[' + options.offset + ']' : null;
        debug('._parseRow() has called for %s | %s', domSelector, jsSelector);
        if (domSelector) {
            this._domScope.push(domSelector, scope.parentScope);
        }
        if (jsSelector) {
            this._jsScope.push(jsSelector, jsSelector.parentScope);
        }

        const row = await this._parseCollectionRule({
            collection: options.collection
        });
        options.results.push(row);
        if (domSelector) {
            this._domScope.pop();
        }
        if (jsSelector) {
            this._jsScope.pop();
        }

        options.nodesCount--;
        if (options.nodesCount >= 0) {
            options.offset++;
            return this._parseRow(options);
        }

        const results = options.results;
        if (this.clearDom) {
            debug('clear parsed dom for %s', domSelector);
            await this._env.evaluateJs(domSelector, /* @covignore */ function(domSelector) {
                const parsedElement = Sizzle(domSelector)[0];
                if (!parsedElement) {
                    return;
                }
                const boundingRect = parsedElement.getBoundingClientRect();
                parsedElement.innerHTML = '';
                parsedElement.style.height = boundingRect.height + 'px';
                parsedElement.style.width = boundingRect.width + 'px';
            });
        }
        return results;
    }

    async _injectBrowserRule(rule, offset, actionsResults) {
        debug('._injectBrowserRule()');
        let internalGooseResults, internalGooseError;
        await this._env.injectBrowserEnv();
        await this._env.evaluateJs(rule, offset, this._domScope, function(rule, offset, scopes) {
            __gooseParse(rule, offset, scopes);
        });
        await this._actions.wait(
            () => {
                return [__gooseResults, __gooseError];
            },
            resultsToCheck => {
                internalGooseResults = resultsToCheck[0];
                internalGooseError = resultsToCheck[1];
                return internalGooseResults || internalGooseError;
            },
            null,
            rule.injectionTimeout
        );

        if (internalGooseError) {
            throw internalGooseError;
        }

        return internalGooseResults;
    }

    /**
     * Parse Collection rule
     * @param {Rule} rule
     * @returns {Promise}
     * @private
     */
    async _parseCollectionRule(rule) {
        debug('._parseCollectionRule() has called for rule %o', rule);

        const collection = rule.collection;
        const results = await collection.reduce(async (accumulator, rule) => {
            accumulator = await accumulator;
            let result = await this.processRule(rule);
            let name;
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
            if (!rule.virtual) {
                accumulator[name] = result;
            }
            return accumulator;
        }, {});
        debug('._parseCollectionRule() result %o', results);
        return results;
    }

    /**
     * @param {Rule} rule
     * @returns {{type: string, value: string|number}}
     * @private
     */
    _getSimpleRuleFilter(rule) {
        const filter = {
            type: 'text'
        };
        if (typeof rule.child !== 'undefined') {
            filter.type = 'child';
            filter.value = rule.child;
        } else if (rule.attr) {
            filter.type = 'attr';
            filter.value = rule.attr;
        } else if (rule.prop) {
            filter.type = 'prop';
            filter.value = rule.prop;
        }

        return filter;
    }

    /**
     * Parse simple rule
     * @param {Rule} rule
     * @returns {Promise}
     * @private
     */
    async _parseSimpleRule(rule) {
        const selector = this._domScope.getSelector();
        const jsSelector = rule.jsScope ? this._jsScope.getSelector() : '';
        const filter = this._getSimpleRuleFilter(rule);
        debug('._parseSimpleRule() has called for selector %s with filter %o', selector, filter);
        const results = await this._env.evaluateJs(selector, jsSelector, filter, /* istanbul ignore next */ function(selector, jsSelector, filter) {
            if (jsSelector) {
                const value = eval(jsSelector);
                return Array.isArray(value) ? value : [value];
            }

            const nodes = Sizzle(selector);
            return nodes.map(function(node) {
                switch (filter.type) {
                    case 'child':
                        const childNode = node.childNodes[filter.value];
                        return childNode ? childNode.textContent : '';
                    case 'attr':
                        if (typeof filter.value === 'object' && Array.isArray(filter.value.or)) {
                            const res = filter.value.or.map(function(value) {
                                return node.getAttribute(value);
                            }).filter(Boolean);
                            return res.pop();
                        }
                        return node.getAttribute(filter.value);
                    case 'prop':
                        return node[filter.value];
                    default:
                        return node.textContent;
                }
            });
        });
        if (!results) {
            throw new Error('Error during querying selector: ' + (selector || jsSelector));
        }
        debug('._parseSimpleRule() result %o', results);
        return results;
    }

    /**
     * @param results
     * @returns {Promise.<*>}
     * @private
     */
    async _paginate(results) {
        debug('Pagination...');
        const pagination = await this._paginator.paginate();
        if (pagination.done) {
            return results;
        }

        const offset = this._paginator.resetCollectionOffsetOnNewPage() ? 0 : results.length;

        const pageResults = await this._parseRootRule(offset);
        debug('Pagination results %o', pageResults);
        results = results.concat(pageResults);
        const maxResults = this._paginator.getMaxResultsCount() - 1;
        if (results.length > maxResults) {
            results = results.slice(0, maxResults);
            return results;
        }
        return this._paginate(results);
    }
}

module.exports = Parser;
