/**
 * @fileOverview
 *
 * Extracts current page url
 */

const Action = require('./Action');

class ActionUrl extends Action {
    async perform() {
        return this._env.evaluateJs(/* @covignore */ function () {
            return window.location.toString();
        });
    }
}

module.exports = ActionUrl;

