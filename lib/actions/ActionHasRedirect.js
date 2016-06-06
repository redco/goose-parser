/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionHasRedirect extends Action {
    perform () {
        return this._env.hasRedirect(this._options.url);
    }
}

module.exports = ActionHasRedirect;

