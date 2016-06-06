/**
 * @fileOverview
 *
 */

'use strict';

const Action = require('./Action');

class ActionParse extends Action {
    perform () {
        return this._parser.processRule(this._options.rules);
    }
}

module.exports = ActionParse;

