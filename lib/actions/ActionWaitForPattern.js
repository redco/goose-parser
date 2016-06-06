/**
 * @fileOverview
 *
 * Wait for an element'c content matches pattern
 */

'use strict';

const ActionWait = require('./ActionWait');

class ActionWaitForPattern extends ActionWait {
    perform () {
        const pattern = this._options.pattern;
        const selector = this._selector;

        this.log('%s on selector %s', pattern, selector);
        return this.wait(/* @covignore */ function(selector) {
            var nodes = Sizzle(selector);
            return nodes.length && nodes[0].textContent || '';
        }, function(text) {
            return text.match(pattern) !== null;
        }, [selector]);
    }
}

module.exports = ActionWaitForPattern;

