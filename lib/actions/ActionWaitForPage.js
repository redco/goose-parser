/**
 * @fileOverview
 *
 * Wait for new page load
 */

const Action = require('./Action');
const { waitForEvent } = require('../tools/wait');

class ActionWaitForPage extends Action {
    async perform() {
        return waitForEvent(
          this._env,
          { type: 'navigation'},
          this._options.breaker,
          this._options.timeout
        );
    }
}

module.exports = ActionWaitForPage;

