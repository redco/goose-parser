/**
 * @fileOverview
 *
 * Wait for uri query match specified URI happens
 */

const Action = require('./Action');

class ActionWaitForQuery extends Action {
    async perform() {
        return this._env.waitForQuery(this._options.uri, this._options.timeout);
    }
}

module.exports = ActionWaitForQuery;

