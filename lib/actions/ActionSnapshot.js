/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionSnapshot extends Action {
    perform () {
        return this._env.snapshot(this._options.name)
    }
}

module.exports = ActionSnapshot;

