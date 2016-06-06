/**
 * @fileOverview
 *
 * Perform mousedown on the element matched by selector
 */

'use strict';

const Action = require('./Action');

class ActionMousedown extends Action {
    perform () {
        this.log('mousedown on %s', this._selector);
        return this._env.mousedown(this._selector);
    }
}

module.exports = ActionMousedown;

