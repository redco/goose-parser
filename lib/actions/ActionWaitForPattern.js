/**
 * @fileOverview
 *
 * Wait for an element'c content matches pattern
 */

const ActionWait = require('./ActionWait');

class ActionWaitForPattern extends ActionWait {
    async perform() {
        const { pattern, attr } = this._options;
        const selector = this._selector;
        this.log('%s on selector %s', pattern, selector);
        return this.wait(/* istanbul ignore next */ function (selector, attr) {
            const nodes = Sizzle(selector);
            if (nodes.length === 0) {
                return '';
            }
            if (attr) {
                return nodes[0].getAttribute(attr);
            }
            return nodes[0].textContent;
        }, (text) => {
            return text.match(pattern) !== null;
        }, this._options.breaker, [selector, attr]);
    }
}

module.exports = ActionWaitForPattern;

