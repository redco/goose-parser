/**
 * @fileOverview
 *
 * Perform MouseDown on the element matched by selector
 */

const Action = require('./Action');

class ActionMouseDown extends Action {
    async perform() {
        this.log('mouseDown on %s', this._selector);
        return this._env.mouseDown(this._selector);
    }
}

module.exports = ActionMouseDown;

