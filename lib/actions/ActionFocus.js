/**
 * @fileOverview
 *
 * Perform click to specified selector on the page
 */

const Action = require('./Action');

class ActionFocus extends Action {
    async perform() {
        this.log('focus on %s', this._selector);
        const focusedCount = await this._env.evaluateJs(this._selector, /* @covignore */ function (selector) {
            const nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].focus();
            }

            return nodes.length;
        });
        this.log('focused consequently %s nodes', focusedCount);
    }
}

module.exports = ActionFocus;
