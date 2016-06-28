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
        const visibility = this._options.visibility === undefined ? true : this._options.visibility;
        return this.wait(/* @covignore */ function(selector, visibility) {
            var nodes = Array.prototype.slice.call(Sizzle(selector), 0);
            const result = nodes.some(function(node) {
                return node.offsetWidth !== 0 && node.offsetHeight !== 0;
            });

            return visibility ? result : !result;
        }, function(result) {
            return result;
        }, [this._selector, visibility]);
    }
}

module.exports = ActionWaitForVisible;

