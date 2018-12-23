/**
 * @fileOverview
 *
 * Wait for an element is on the page become visible or invisible
 */

const ActionWait = require('./ActionWait');

class ActionWaitForVisible extends ActionWait {
    async perform() {
        const visibility = this._options.visibility === undefined ? true : this._options.visibility;
        return this.wait(/* istanbul ignore next */ function (selector, visibility) {
            const nodes = Array.prototype.slice.call(Sizzle(selector), 0);
            const result = nodes.some(function (node) {
                return node.offsetWidth !== 0 && node.offsetHeight !== 0;
            });

            return visibility ? result : !result;
        }, (result) => {
            return result;
        }, this._options.breaker, [this._selector, visibility]);
    }
}

module.exports = ActionWaitForVisible;

