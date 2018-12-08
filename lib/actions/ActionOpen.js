/**
 * @fileOverview
 *
 * Opens a page
 */

const Action = require('./Action');

class ActionOpen extends Action {
    perform() {
        const { url } = this._options;
        return this._env.goto(url);
    }
}

module.exports = ActionOpen;

