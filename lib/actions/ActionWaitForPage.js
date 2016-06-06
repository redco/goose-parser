/**
 * @fileOverview
 *
 * Wait for new page load
 */

'use strict';

const Action = require('./Action');

class ActionWaitForPage extends Action {
    perform () {
        return this._env.waitForPage(this._options.timeout);
    }
}

module.exports = ActionWaitForPage;

