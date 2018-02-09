/**
 * @fileOverview
 *
 * Type text to the element by emulating of several events:
 * - focus element
 * - type value
 * - emulate keyDown event
 * - emulate keyUp event
 * - blur element
 */

const Action = require('./Action');

class ActionType extends Action {
    async perform() {
        const text = this._options.useActionsResult ? this._prevResult : this._options.text;
        this.log('typing %s on %s', text, this._selector);

        const typedCount = await this._env.evaluateJs(this._selector, text, /* @covignore */ function (selector, text) {
            const nodes = Sizzle(selector);
            for (var i = 0, l = nodes.length; i < l; i++) {
                const node = nodes[i];
                node.focus();
                node.value = text;
                node.dispatchEvent(new Event('keydown'));
                node.dispatchEvent(new Event('keyup'));
                node.blur();
            }

            return nodes.length;
        });
        this.log('text types in %s nodes', typedCount);
    }
}

module.exports = ActionType;

