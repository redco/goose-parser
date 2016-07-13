/**
 * @fileOverview
 *
 * Type text to the element
 */

'use strict';

const Action = require('./Action');

class ActionType extends Action {
    perform () {
        const text = this._options.useActionsResult ? this._previousActionResult : this._options.text;
        this.log('typing %s on %s', text, this._selector);

        return this._env
            .evaluateJs(this._selector, text, /* @covignore */ function(selector, text) {
                var nodes = Sizzle(selector);
                for (var i = 0, l = nodes.length; i < l; i++) {
                    var node = nodes[i];
                    node.focus();
                    node.value = text;
                    node.blur();
                }

                return nodes.length;
            })
            .then(len => this.log('text types in %s nodes', len));
    }
}

module.exports = ActionType;

