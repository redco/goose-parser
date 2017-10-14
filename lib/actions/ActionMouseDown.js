/**
 * @fileOverview
 *
 * Perform MouseDown on the element matched by selector
 */

'use strict';

const Action = require('./Action');

class ActionMouseDown extends Action {
    async perform() {
        this.log('mousedown on %s', this._selector);
        return this._env.mousedown(this._selector);
    }
}

module.exports = ActionMouseDown;

