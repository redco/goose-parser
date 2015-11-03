var debug = require('debug')('Paginator'),
    vow = require('vow');

/**
 * @typedef {object} Pagination
 * @property {string} type
 * @property {number} [maxPagesCount]
 * @property {Environment} environment
 * @property {?Array.<Action>} actions
 */

/**
 * type=scroll
 * @typedef {Pagination} ScrollPagination
 * @property {number} interval
 */

/**
 * type=page
 * @typedef {Pagination} PagePagination
 * @property {string} scope
 * @property {string} pageScope
 */

function Paginator(options) {
    this._actions = options.actions;
    this._env = options.environment;
    this._maxPage = options.maxPagesCount || Infinity;
    this._type = options.type || this.TYPES.SCROLL;
    this._currentPage = 0;

    switch (this._type) {
        case this.TYPES.SCROLL:
            this._scrollInterval = options.interval || 1000;
            break;
        case this.TYPES.PAGE:
            this._scope = options.scope;
            this._pageScope = options.pageScope;
            break;
    }
}

Paginator.prototype = {
    constructor: Paginator,

    TYPES: {
        SCROLL: 'scroll',
        PAGE: 'page'
    },

    /**
     * @returns {string}
     */
    getType: function () {
        return this._type;
    },

    reset: function () {
        this._currentPage = 0;
    },

    /**
     * @returns {Promise}
     */
    paginate: function () {
        if (this._currentPage >= this._maxPage) {
            debug('Pagination finished because of max page is achieved');
            return vow.resolve({
                done: true
            });
        }
        this._currentPage++;

        debug('page: %s', this._currentPage);
        switch (this._type) {
            case this.TYPES.SCROLL:
                return this._paginateScroll();

            case this.TYPES.PAGE:
                return this._paginatePage();

            default:
                return vow.reject(new Error('Unknown pagination type: ' + this._type));
        }
    },

    /**
     * @returns {Promise}
     * @private
     */
    _paginateScroll: function () {
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
    },

    /**
     * @returns {Promise}
     * @private
     */
    _paginatePage: function () {
        var selector = this._scope + ':eq(' + this._currentPage + ')';
        var previousPageHtml;
        return this._env
            .evaluateJs(this._pageScope, this._getPaginatePageHtml)
            .then(function (html) {
                previousPageHtml = html;
            })
            .then(this._actions.click.bind(this._actions, selector))
            .then(function () {
                return this._actions.wait(this._getPaginatePageHtml, function (html) {
                    return html !== previousPageHtml;
                }, [this._pageScope], 2000);
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
    },

    _getPaginatePageHtml: function (selector) {
        var nodes = Sizzle(selector);
        return nodes.reduce(function (html, node) {
            return html + node.innerHTML;
        }, '');
    }
};

module.exports = Paginator;
