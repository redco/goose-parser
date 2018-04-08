/**
 * @fileOverview
 *
 * Allows to parse passed rules by action
 */

const Action = require('./Action');

class ActionParse extends Action {
    async perform() {
        return this._parser.processRule(this._options.rules || {});
    }
}

module.exports = ActionParse;

