/**
 * @fileOverview
 *
 * Opens a page
 */

const Action = require('./Action');

class ActionOpen extends Action {
    perform() {
        return this._env.evaluateJs(this._options.url, /* istanbul ignore next */function (url) {
            window.location = url;
        });
    }
}

module.exports = ActionOpen;

