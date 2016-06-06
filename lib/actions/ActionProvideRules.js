/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');
const Promise = require('vow').Promise;

class ActionProvideRules extends Action {
    perform () {
        const rules = this._options.rules;
        this.log('Providing rules %o', rules);
        return Promise.resolve(rules);
    }
}

module.exports = ActionProvideRules;

