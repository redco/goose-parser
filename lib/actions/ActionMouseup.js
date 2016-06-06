/**
 * @fileOverview
 *
 * Perform mouseup on the element matched by selector
 */

'use strict';

const Action = require('./Action');

class ActionMouseup extends Action {
    perform () {
        this.log('mouseup on %s', this._selector);
        return this._env.mouseup(this._selector);
    }
}

module.exports = ActionMouseup;

