/**
 * @fileOverview
 *
 * Wait for an element'c content matches pattern
 */

const ActionWait = require('./ActionWait');

class ActionWaitForPattern extends ActionWait {
    async perform() {
        const pattern = this._options.pattern;
        const selector = this._selector;

        this.log('%s on selector %s', pattern, selector);
        return this.wait(/* @covignore */ (selector) => {
            const nodes = Sizzle(selector);
            return nodes.length && nodes[0].textContent || '';
        }, (text) => {
            return text.match(pattern) !== null;
        }, [selector]);
    }
}

module.exports = ActionWaitForPattern;

