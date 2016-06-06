/**
 * @fileOverview
 *
 * Check if element exists on the page
 */

'use strict';

const Action = require('./Action');

class ActionExist extends Action {
    perform () {
        const child = (this._options.child !== undefined) ? this._options.child : null;
        return this._env.evaluateJs(this._selector, child, /* @covignore */ function(selector, child) {
            var selected = Sizzle(selector);
            return selected.length > 0 && (child === null || (selected[0].childNodes[child] !== undefined));
        });
    }
}

module.exports = ActionExist;

