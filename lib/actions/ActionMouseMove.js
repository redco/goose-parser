/**
 * @fileOverview
 *
 * Perform mouseup on the element matched by selector
 */

const Action = require('./Action');

class ActionMouseMove extends Action {
    perform () {
        this.log('mouseMove on %s', this._selector);
        return this._env.mouseMove(this._selector);
    }
}

module.exports = ActionMouseMove;

