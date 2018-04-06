/**
 * @fileOverview
 *
 * Perform MouseUp on the element matched by selector
 */

const Action = require('./Action');

class ActionMouseUp extends Action {
    async perform() {
        this.log('mouseUp on %s', this._selector);
        return this._env.mouseUp(this._selector);
    }
}

module.exports = ActionMouseUp;

