/**
 * @fileOverview
 *
 * Performs change of the element styles
 *
 */

const Action = require('./Action');

class ActionChangeElement extends Action {
    async perform () {
        const changeStyleOptions = this._options.change || {};
        return this._env.evaluateJs(this._selector, changeStyleOptions, /* @covignore */ function (selector, changeStyleOptions) {
            const element = Sizzle(selector)[0];
            Object.keys(changeStyleOptions).forEach(function (key) {
                element.style[key] = changeStyleOptions[key];
            });
        });
    }
}

module.exports = ActionChangeElement;

