/**
 * @fileOverview
 *
 * Perform click to specified selector on the page
 */

'use strict';

const Action = require('./Action');

class ActionClick extends Action {
    perform () {
        this.log('click by %s', this._selector);
        return this._env
            .evaluateJs(this._selector, /* @covignore */ function(selector) {
                var nodes = Sizzle(selector);
                for (var i = 0, l = nodes.length; i < l; i++) {
                    nodes[i].click();
                }

                return nodes.length;
            })
            .then(len => this.log('clicked %s nodes', len));
    }
}

module.exports = ActionClick;
