/**
 * @fileOverview
 *
 * Perform mouseup on the element matched by selector
 */

'use strict';

const Action = require('./Action');

class ActionMouseMove extends Action {
    perform () {
        this.log('mousemove on %s', this._selector);
        return this._env.mouseMove(this._selector);
    }
}

module.exports = ActionMouseMove;

