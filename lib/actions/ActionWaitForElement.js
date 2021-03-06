/**
 * @fileOverview
 * Waits for element to exits on the page
 */

const ActionWait = require('./ActionWait');

class ActionWaitForElement extends ActionWait {
    async perform() {
        this.log('._waitElement() ' + this._selector);
        return this.wait(/* istanbul ignore next */ function (selector) {
            return Sizzle(selector).length;
        }, function (foundElementsCount) {
            return !!foundElementsCount;
        }, this._options.breaker, [this._selector]);
    }
}

module.exports = ActionWaitForElement;

