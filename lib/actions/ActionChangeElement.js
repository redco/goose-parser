/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionChangeElement extends Action {
    perform () {
        const changeStyleOptions = this._options.change || {};
        return this._env.evaluateJs(this._selector, changeStyleOptions, /* @covignore */ function (selector, changeStyleOptions) {
            var element = Sizzle(selector)[0];
            Object.keys(changeStyleOptions).forEach(function(key) {
                console.log(key, changeStyleOptions[key]);
                element.style[key] = changeStyleOptions[key];
            });
        });
    }
}

module.exports = ActionChangeElement;

