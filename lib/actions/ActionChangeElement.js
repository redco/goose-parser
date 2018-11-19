/**
 * @fileOverview
 *
 * Performs change of the element styles
 *
 */

const Action = require('./Action');

class ActionChangeElement extends Action {
    async perform () {
        const changeStyleOptions = this._options.change || this._options.style || {};
        const changeAttrOptions = this._options.attr || {};
        return this._env.evaluateJs(this._selector, changeStyleOptions, changeAttrOptions,
          /* istanbul ignore next */
          function (selector, changeStyleOptions, changeAttrOptions) {
              const element = Sizzle(selector)[0];
              if (!element) {
                  return;
              }
              Object.keys(changeStyleOptions).forEach(function (key) {
                  element.style[key] = changeStyleOptions[key];
              });
              Object.keys(changeAttrOptions).forEach(function (key) {
                  element.setAttribute(key, changeAttrOptions[key]);
              });
          });
    }
}

module.exports = ActionChangeElement;

