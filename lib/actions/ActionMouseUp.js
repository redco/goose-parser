/**
 * @fileOverview
 *
 * Perform MouseUp on the element matched by selector
 */

const Action = require('./Action');

class ActionMouseUp extends Action {
    async perform() {
        this.log('mouseup on %s', this._selector);
        return this._env.mouseup(this._selector);
    }
}

module.exports = ActionMouseUp;

