/**
 * @fileOverview
 *
 * Wait for query which match specified URI happens
 */

'use strict';

const Action = require('./Action');

class ActionWaitForQuery extends Action {
    perform () {
        return this._env.waitForQuery(this._options.uri, this._options.timeout);
    }
}

module.exports = ActionWaitForQuery;

