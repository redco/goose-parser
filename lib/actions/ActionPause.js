/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');
const Promise = require('vow').Promise;

class ActionPause extends Action {
    perform () {
        return new Promise(resolve => setTimeout(() => resolve(), this._options.timeout));
    }
}

module.exports = ActionPause;

