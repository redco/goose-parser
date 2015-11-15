var debug = require('debug')('Paginator'),
    vow = require('vow');

/**
 * @typedef {object} Pagination
 * @property {string} type
 * @property {string} [strategy]
 * @property {number} [maxPagesCount]
 * @property {number} [maxResultsCount]
 * @property {number} [timeout]
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
    this._timeout = options.timeout || 2000;
    this._maxResultsCount = options.maxResultsCount || Infinity;
    this._type = options.type || this.TYPES.SCROLL;
    this._strategy = options.strategy || null;
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

    STRATEGY: {
        NEW_PAGE: 'newPage',
        AJAX: 'ajax'
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
            .evaluateJs(/* @covignore */ function () {
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
     * Return next page index
     * @returns {Promise}
     * @private
     */
    _getRealNextPageIndex: function () {
        return this._env.evaluateJs(this._scope, /* @covignore */ function (selector) {
            var nodes = Sizzle(selector);
            return nodes.map(function (node) {
                return parseInt(node.textContent);
            });
        }).then(function (pages) {
            var pageIndex;
            if (!Array.isArray(pages) || (pageIndex = pages.indexOf(this._currentPage + 1)) === -1) {
                throw new Error('Cannot detect page index for pagination');
            }
            debug('Real page index is %s among pages %o', pageIndex, pages);
            return pageIndex;
        }, this);
    },

    /**
     * Paginate an ajax/new page
     * @returns {Promise}
     * @private
     */
    _paginatePage: function () {
        var selector;
        var previousPageHtml;
        return this._getRealNextPageIndex()
            .then(function (realPageIndex) {
                selector = this._scope + ':eq(' + realPageIndex + ')';
            }, this)
            .then(function () {
                return this._env.evaluateJs(this._pageScope, this._getPaginatePageHtml);
            }, this)
            .then(function () {
                var paginationPromise;
                switch (this._strategy) {
                    case this.STRATEGY.NEW_PAGE:
                        paginationPromise = this._env.waitForPage(this._timeout);
                        break;
                    case this.STRATEGY.AJAX:
                        paginationPromise = this._hasPageDataChanged(previousPageHtml);
                        break;
                    case null:
                        paginationPromise = vow.any([
                            this._env.waitForPage(this._timeout).then(function () {
                                this._strategy = this.STRATEGY.NEW_PAGE;
                                debug('Set strategy to %s', this._strategy);
                            }, this),
                            this._hasPageDataChanged(previousPageHtml).then(function () {
                                this._strategy = this.STRATEGY.AJAX;
                                debug('Set strategy to %s', this._strategy);
                            }, this)
                        ]);
                        break;
                }

                return vow.all([this._actions.click(selector), paginationPromise]);
            }, this)
            .then(function () {
                debug('page %s opened', this._currentPage);
                return {
                    value: this._currentPage,
                    done: false
                };
            }, function (e) {
                debug('Cannot paginate anymore after %s page, because of error %s', this._currentPage, e.message);
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
    _getPaginatePageHtml: /* @covignore */ function (selector) {
        // this check is required to prevent page errors on page-load
        if (typeof Sizzle === "undefined") {
            return null;
        }

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
        return this._actions.wait(/* @covignore */ function () {
            return document.body.scrollHeight;
        }, function (scrollHeight) {
            return scrollHeight > previousPageHeight;
        }, [], this._timeout);
    },

    /**
     * Checks if data has changed on the page
     * @param previousPageHtml
     * @returns {Promise}
     * @private
     */
    _hasPageDataChanged: function (previousPageHtml) {
        return this._actions.wait(this._getPaginatePageHtml, function (html) {
            return html !== null && html !== previousPageHtml;
        }, [this._pageScope], this._timeout);
    }
};

module.exports = Paginator;
