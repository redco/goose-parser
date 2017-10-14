/**
 * @fileOverview
 *
 * This transform transforms formatted date from one format to another using {@link http://momentjs.com momentjs}
 */

const Transform = require('./Transform');
const moment = require('moment');

class TransformDate extends Transform {
    doTransform() {
        return moment(this._value, this._options.from, this._options.locale || 'en')
            .format(this._options.to);
    }
}

module.exports = TransformDate;
