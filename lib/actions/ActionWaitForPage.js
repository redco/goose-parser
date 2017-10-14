/**
 * @fileOverview
 *
 * Wait for new page load
 */

const Action = require('./Action');

class ActionWaitForPage extends Action {
    async perform() {
        return this._env.waitForPage(this._options.timeout);
    }
}

module.exports = ActionWaitForPage;

