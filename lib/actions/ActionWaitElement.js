/**
 * @fileOverview
 * Waits for element to exits on the page
 */

const ActionWait = require('./ActionWait');

class ActionWaitElement extends ActionWait {
    async perform() {
        this.log('._waitElement() ' + this._selector);
        return this.wait(/* @covignore */ (selector) => {
            return Sizzle(selector).length;
        }, (foundElementsCount) => {
            return !!foundElementsCount;
        }, [this._selector]);
    }
}

module.exports = ActionWaitElement;

