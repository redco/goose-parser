/**
 * @fileOverview
 *
 * Check if element exists on the page
 */

const Action = require('./Action');

class ActionExist extends Action {
    async perform() {
        const child = (this._options.child !== undefined) ? this._options.child : null;
        return this._env.evaluateJs(this._selector, child, /* istanbul ignore next */ function (selector, child) {
            const selected = Sizzle(selector);
            return selected.length > 0 && (child === null || (selected[0].childNodes[child] !== undefined));
        });
    }
}

module.exports = ActionExist;

