var debug = require('debug')('Paginator'),
    vow = require('vow');

/**
 * @typedef {object} Pagination
 * @property {string} type
 * @property {number} [maxPagesCount]
 * @property {number} [maxResultsCount]
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
    this._maxResultsCount = options.maxResultsCount || Infinity;
    this._type = options.type || this.TYPES.SCROLL;
    this._currentPage = 0;

    switch (this._type) {
        case this.TYPES.SCROLL:
            this._scrollInterval = options.interval || 1000;
            break;
        case this.TYPES.PAGE:
        case this.TYPES.PAGE_HREF:
            this._scope = options.scope;
            this._pageScope = options.pageScope;
            break;
    }
}

Paginator.prototype = {
    constructor: Paginator,

    TYPES: {
        SCROLL: 'scroll',
        PAGE: 'page',
        PAGE_HREF: 'pageHref'
    },

    /**
     * Get pagination type
     * @returns {string}
     */
    getType: function () {
        return this._type;
    },

    /**
     * Get max results count
     * @returns {number}
     */
    getMaxResultsCount: function () {
        return this._maxResultsCount;
    },

    /**
     * Reset pagination
     */
    reset: function () {
        this._currentPage = 0;
    },

    /**
     * Paginate
     * @returns {Promise}
     */
    paginate: function () {
        if (this._currentPage >= this._maxPage - 1) {
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
            case this.TYPES.PAGE_HREF:
                return this._paginatePage();

            default:
                return vow.reject(new Error('Unknown pagination type: ' + this._type));
        }
    },

    /**
     * Paginate scroll page
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
                return this._hasPageScrolled(previousHeight);
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
     * Paginate ajax page
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
            .then(function () {
                var action = {
                    type: 'click'
                };
                if (this._type === this.TYPES.PAGE_HREF) {
                    action.waitForPage = true;
                }
                return this._actions
                    .performActions([action], selector)
                    .then(function () {
                        if (this._type === this.TYPES.PAGE_HREF) {
                            return vow.resolve();
                        }
                        return this._hasPageDataChanged(previousPageHtml);
                    }, this);
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
     * Get page scope HTML
     * @param {string} selector
     * @returns {string}
     * @private
     */
    _getPaginatePageHtml: function (selector) {
        var nodes = Sizzle(selector);
        return nodes.reduce(function (html, node) {
            return html + node.innerHTML;
        }, '');
    },

    /**
     * Check if page scrolled after pagination
     * @param {number} previousPageHeight
     * @returns {Promise}
     * @private
     */
    _hasPageScrolled: function (previousPageHeight) {
        return this._actions.wait(function () {
            return document.body.scrollHeight;
        }, function (scrollHeight) {
            return scrollHeight > previousPageHeight;
        }, [], 2000);
    },

    _hasPageDataChanged: function (previousPageHtml) {
        return this._actions.wait(this._getPaginatePageHtml, function (html) {
            return html !== previousPageHtml;
        }, [this._pageScope], 2000);
    }
};

module.exports = Paginator;
