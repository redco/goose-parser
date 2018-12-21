const debug = require('debug')('Action');

class Action {
    /**
     * @param {object} options
     * @param {string} options.selector
     * @param {ActionOptions} options.actionOptions
     * @param {string} options.parentSelector
     * @param {AbstractEnvironment} options.env
     * @param {Actions} options.actions
     * @param {Parser} options.parser
     * @param {*} options.prevResult
     */
    constructor(options) {
        this._selector = options.selector;
        this._parentSelector = options.parentSelector;
        this._options = options.actionOptions;
        if (!this._options.breaker) {
            this._options.breaker = () => false;
        }
        this._env = options.env;
        this._actions = options.actions;
        this._parser = options.parser;
        this._prevResult = options.prevResult;
    }

    async perform() {
        throw new Error('You must redefine this method in the real action');
    }

    /**
     * @returns {Array.<string>} The list of the methods of other components on which it depends on
     *                           (e.g. Environment.evaluateJs, Parser.parse, ...)
     */
    dependsOn() {
        return [];
    }

    log(msg) {
        const args = Array.prototype.slice.call(arguments);
        args.splice(0, 1, `[${this._options.type}] ${msg}`);
        debug.apply(null, args);
    }
}

module.exports = Action;
