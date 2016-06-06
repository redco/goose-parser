/**
 * @fileOverview
 *
 */

'use strict';

const ActionWait = require('./ActionWait');

class ActionWaitElement extends ActionWait {
    perform () {
        this.log('._waitElement() ' + this._selector);
        return this.wait(/* @covignore */ function(selector) {
            return Sizzle(selector).length;
        }, function(foundElementsCount) {
            return !!foundElementsCount;
        }, [this._selector]);
    }
}

module.exports = ActionWaitElement;

