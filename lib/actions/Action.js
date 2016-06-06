'use strict';

const debug = require('debug')('Action');

class Action {
    constructor(options) {
        this._selector = options.selector;
        this._options = options.actionOptions;
        this._env = options.env;
        this._parser = options.parser;
        this._previousActionResult = options.previousActionResult;
    }

    perform() {
        throw new Error('You must redefine this method in the child class');
    }

    log(msg) {
        const args = Array.prototype.slice.call(arguments);
        args.splice(0, 1, `[${this._options.type}] ${msg}`);
        debug.apply(null, args);
    }
}
module.exports = Action;
