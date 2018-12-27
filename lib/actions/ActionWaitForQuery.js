/**
 * @fileOverview
 *
 * Wait for uri query match specified URI happens
 */

const Action = require('./Action');
const { waitForEvent } = require('../tools/wait');

class ActionWaitForQuery extends Action {
    async perform() {
        return waitForEvent(
          this._env,
          { type: 'request', urlPattern: this._options.uri },
          this._options.breaker,
          this._options.timeout
        );
    }
}

module.exports = ActionWaitForQuery;

