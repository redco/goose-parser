/**
 * @fileOverview Action for providing dynamic parsing rules as action result
 */

const Action = require('./Action');

class ActionProvideRules extends Action {
    async perform() {
        const rules = this._options.rules || {};
        this.log('Providing rules %o', rules);
        return Promise.resolve(rules);
    }
}

module.exports = ActionProvideRules;

