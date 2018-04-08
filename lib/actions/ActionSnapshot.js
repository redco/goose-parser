/**
 * @fileOverview
 *
 * Performs snapshot via action
 */

const Action = require('./Action');

class ActionSnapshot extends Action {
    async perform() {
        return this._env.snapshot(this._options.name);
    }
}

module.exports = ActionSnapshot;

