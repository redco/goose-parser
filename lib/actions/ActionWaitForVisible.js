/**
 * @fileOverview
 *
 * Wait for an element is on the page and visible
 */

'use strict';

const ActionWait = require('./ActionWait');

class ActionWaitForVisible extends ActionWait {
    perform () {
        this.log(this._selector);
        return this.wait(/* @covignore */ function(selector) {
            var nodes = Array.prototype.slice.call(Sizzle(selector), 0);
            return nodes.some(function(node) {
                return node.offsetWidth !== 0 && node.offsetHeight !== 0;
            });
        }, function(visible) {
            return visible;
        }, [this._selector]);
    }
}

module.exports = ActionWaitForVisible;

