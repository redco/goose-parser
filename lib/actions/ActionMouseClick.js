/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionMouseClick extends Action {
    perform () {
        return this._env.mouseClick(this._selector);
    }
}

module.exports = ActionMouseClick;
