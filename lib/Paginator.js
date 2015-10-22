var debug = require('debug')('Paginator'),
    vow = require('vow');

function Paginator(options) {
    this._actions = options.actions;
    this._env = options.environment;
    this._maxPage = options.maxPagesCount || Infinity;
    this._type = options.type || 'scroll';
    this._scrollInterval = options.interval || 1000;
    this._currentPage = 0;
}

Paginator.prototype = {
    constructor: Paginator,

    reset: function () {
        this._currentPage = 0;
    },

    paginate: function () {
        if (this._currentPage >= this._maxPage) {
            debug('Pagination finished because of max page is achieved');
            return vow.resolve({
                done: true
            });
        }
        this._currentPage++;

        debug('page: %s', this._currentPage);
        var previousHeight;
        return this._env
            .evaluateJs(function () {
                return document.body.scrollHeight;
            })
            .then(function (height) {
                previousHeight = height;
            })
            .then(this._actions.scroll.bind(this._actions, this._scrollInterval))
            .then(function () {
                return this._actions.wait(function () {
                    return document.body.scrollHeight;
                }, function (scrollHeight) {
                    return scrollHeight > previousHeight;
                }, [], 2000);
            }, this)
            .then(function () {
                debug('page %s opened', this._currentPage);
                return {
                    value: this._currentPage,
                    done: false
                };
            }, function (e) {
                debug('Cannot paginate anymore after %s page', this._currentPage);
                return {
                    done: true
                }
            }, this);
    }
};

module.exports = Paginator;
