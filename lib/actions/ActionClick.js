/**
 * @fileOverview
 *
 * Perform click to specified selector on the page
 */

const Action = require('./Action');

class ActionClick extends Action {
    async perform() {
        this.log('click by %s', this._selector);
        const clickedCount = await this._env.evaluateJs(this._selector, /* istanbul ignore next */ function (selector) {
            const nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                nodes[i].click();
            }

            return nodes.length;
        });
        this.log('clicked %s nodes', clickedCount);
    }
}

module.exports = ActionClick;
