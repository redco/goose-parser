'use strict';

const Action = require('./Action');

class ActionUrl extends Action {
    perform () {
        return this._env.evaluateJs(/* @covignore */ function() {
            return window.location.toString();
        });
    }
}

module.exports = ActionUrl;

