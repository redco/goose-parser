/**
 * @fileOverview
 *
 * Navigates to previous page
 */

'use strict';

const Action = require('./Action');

class ActionBack extends Action {
    perform () {
        return this._env.back();
    }
}

module.exports = ActionBack;

