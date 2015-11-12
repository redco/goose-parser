var debug = require('debug')('Paginator'),
    vow = require('vow');

/**
 * @typedef {object} Pagination
 * @property {string} type
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
    this._paginateStrategy = null;
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
                var paginationPromise;
                switch (this._paginateStrategy) {
                    case this.STRATEGY.NEW_PAGE:
                        paginationPromise = this._env.waitForPage(this._timeout);
                        break;
                    case this.STRATEGY.AJAX:
                        paginationPromise = this._hasPageDataChanged(previousPageHtml);
                        break;
                    case null:
                        paginationPromise = vow.any([
                            this._env.waitForPage(this._timeout).then(function () {
                                this._paginateStrategy = this.STRATEGY.NEW_PAGE;
                                debug('Set paginateStrategy to %s', this._paginateStrategy);
                            }, this),
                            this._hasPageDataChanged(previousPageHtml).then(function () {
                                this._paginateStrategy = this.STRATEGY.AJAX;
                                debug('Set paginateStrategy to %s', this._paginateStrategy);
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
    _getPaginatePageHtml: /* @covignore */ function (selector) {
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
            return html !== previousPageHtml;
        }, [this._pageScope], this._timeout);
    }
};

module.exports = Paginator;
