/**
 * @fileOverview
 *
 * Perform click to specified selector on the page
 */

'use strict';

const Action = require('./Action');

class ActionBlur extends Action {
    perform () {
        this.log('blur on %s', this._selector);
        return this._env
            .evaluateJs(this._selector, /* @covignore */ function(selector) {
                var nodes = Sizzle(selector);
                for (var i = 0, l = nodes.length; i < l; i++) {
                    nodes[i].blur();
                }

                return nodes.length;
            })
            .then(len => this.log('blured consequently %s nodes', len));
    }
}

module.exports = ActionBlur;
