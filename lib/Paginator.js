const debug = require('debug')('Paginator');
const any = require('promise-any');

/**
 * @typedef {object} Pagination
 * @property {string} type
 * @property {string} [strategy]
 * @property {number} [maxPagesCount]
 * @property {number} [maxResultsCount]
 * @property {number} [timeout]
 * @property {AbstractEnvironment} environment
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

const PAGINATION_TYPE = {
    SCROLL: 'scroll',
    PAGE: 'page',
    SHOW_MORE: 'showMore'
};

const PAGINATION_STRATEGY = {
    NEW_PAGE: 'newPage',
    AJAX: 'ajax'
};

class Paginator {
    constructor(options) {
        this._actions = options.actions;
        this._env = options.environment;
        this._maxPage = options.maxPagesCount || Infinity;
        this._timeout = options.timeout || 2000;
        this._maxResultsCount = options.maxResultsCount || Infinity;
        this._type = options.type || PAGINATION_TYPE.SCROLL;
        this._strategy = options.strategy || null;
        this._currentPage = 0;
        this._customPagination = [];
        this._customOptions = options || {};

        switch (this._type) {
            case PAGINATION_TYPE.SCROLL:
                this._scrollInterval = options.interval || 1000;
                break;

            case PAGINATION_TYPE.PAGE:
            case PAGINATION_TYPE.SHOW_MORE:
                this._scope = options.scope;
                this._pageScope = options.pageScope;
                break;
        }
    }

    /**
     * Get pagination type
     * @returns {string}
     */
    getType() {
        return this._type;
    }

    /**
     * Get max results count
     * @returns {number}
     */
    getMaxResultsCount() {
        return this._maxResultsCount;
    }

    /**
     * Reset pagination
     */
    reset() {
        this._currentPage = 0;
    }

    /**
     * Paginate
     * @returns {Promise}
     */
    async paginate() {
        if (this._currentPage >= this._maxPage - 1) {
            debug('Pagination finished because of max page is achieved');
            return {done: true};
        }
        this._currentPage++;

        debug('page: %s', this._currentPage);
        switch (this._type) {
            case PAGINATION_TYPE.SCROLL:
                return this._paginateScroll();

            case PAGINATION_TYPE.PAGE:
                return this._paginatePage();

            case PAGINATION_TYPE.SHOW_MORE:
                return this._paginateShowMore();

            default:
                const customPagination = this._customPagination[this._type];
                if (!customPagination) {
                    throw new Error('Unknown pagination type: ' + this._type);
                }

                return this._paginateCustom(customPagination.paginate, customPagination.checkPaginate, this._customOptions);
        }
    }

    /**
     * @param {string} type
     * @param {Function} paginateFn
     * @param {Function} checkPaginateFn
     * @param {boolean} resetOffset
     */
    addPagination(type, paginateFn, checkPaginateFn, resetOffset) {
        if (typeof paginateFn !== 'function' || typeof checkPaginateFn !== 'function') {
            throw new Error('paginateFn and checkPaginateFn should be functions which return Promise');
        }

        this._customPagination[type] = {
            paginate: paginateFn,
            checkPaginate: checkPaginateFn,
            resetOffset: typeof resetOffset === 'undefined' ? true : resetOffset
        };
    }

    resetCollectionOffsetOnNewPage() {
        const customPagination = this._customPagination[this._type];
        if (customPagination) {
            return customPagination.resetOffset;
        }

        return this._type === PAGINATION_TYPE.PAGE;
    }

    /**
     * Paginate page with custom method
     * @param {Function} paginateFn
     * @param {Function} checkPaginateFn
     * @param {object} options
     * @return
     * @private
     */
    async _paginateCustom(paginateFn, checkPaginateFn, options) {
        try {
            await paginateFn.call(this, options);
            await checkPaginateFn.call(this, options, this._timeout);

            debug('page %s opened', this._currentPage);
            return {
                value: this._currentPage,
                done: false
            };
        } catch (e) {
            debug('Cannot paginate anymore after %s page, because of error %s', this._currentPage, e.message);
            return {
                done: true
            }
        }
    }

    /**
     * Paginate scroll page
     * @returns {Promise}
     * @private
     */
    async _paginateScroll() {
        try {
            const previousHeight = this._env.evaluateJs(/* @covignore */ () => {
                return document.body.scrollHeight;
            });
            await this._actions.scroll(this._scrollInterval);
            await this._hasPageScrolled(previousHeight);
            debug('page %s opened', this._currentPage);
            return {
                value: this._currentPage,
                done: false
            };
        } catch (e) {
            debug('Cannot paginate anymore after %s page, because of error %s', this._currentPage, e.message);
            return {
                done: true
            }
        }
    }

    /**
     * Return next page index
     * @returns {Promise}
     * @private
     */
    async _getRealNextPageIndex() {
        const pages = this._env.evaluateJs(this._scope, /* @covignore */ (selector) => {
            const nodes = Sizzle(selector);
            return nodes.map((node) => {
                return parseInt(node.textContent);
            });
        });
        let pageIndex;
        if (!Array.isArray(pages) || (pageIndex = pages.indexOf(this._currentPage + 1)) === -1) {
            throw new Error('Cannot detect page index for pagination');
        }
        debug('Real page index is %s among pages %o', pageIndex, pages);
        return pageIndex;
    }

    /**
     * Paginate an ajax/new page
     * @returns {Promise}
     * @private
     */
    async _paginatePage() {
        try {
            const nextPageIndex = await this._getRealNextPageIndex();
            const selector = `${this._scope}:eq(${nextPageIndex})`;
            const html = await this._env.evaluateJs(this._pageScope, this._getPaginatePageHtml);

            switch (this._strategy) {
                case PAGINATION_STRATEGY.NEW_PAGE:
                    await this._env.waitForPage(this._timeout);
                    break;
                case PAGINATION_STRATEGY.AJAX:
                    await this._hasPageDataChanged(html);
                    break;
                case null:
                    await any([
                        this._env.waitForPage(this._timeout).then(() => {
                            this._strategy = PAGINATION_STRATEGY.NEW_PAGE;
                            debug('Set strategy to %s', this._strategy);
                        }),
                        this._hasPageDataChanged(html).then(() => {
                            this._strategy = PAGINATION_STRATEGY.AJAX;
                            debug('Set strategy to %s', this._strategy);
                        }, this)
                    ]);
                    break;
            }

            await this._actions.click(selector);
            debug('page %s opened', this._currentPage);
            return {
                value: this._currentPage,
                done: false
            };
        } catch (e) {
            debug('Cannot paginate anymore after %s page, because of error %s', this._currentPage, e.message);
            return {
                done: true
            }
        }
    }

    /**
     * Paginate by clicking show more
     * @returns {Promise}
     * @private
     */
    async _paginateShowMore() {
        try {
            const selector = this._scope;
            const html = await this._env.evaluateJs(this._pageScope, this._getPaginatePageHtml);
            await Promise.all([
                this._actions.click(selector),
                this._hasPageDataChanged(html)
            ]);

            debug('page %s opened', this._currentPage);
            return {
                value: this._currentPage,
                done: false
            };
        } catch (e) {
            debug('Cannot paginate anymore after %s page, because of error %s', this._currentPage, e.message);
            return {
                done: true
            };
        }
    }

    /**
     * Get page scope HTML
     * @param {string} selector
     * @returns {string|null}
     * @private
     */
    _getPaginatePageHtml/* @covignore */(selector) {
        // this check is required to prevent page errors on page-load
        if (typeof Sizzle === "undefined") {
            return null;
        }

        const nodes = Sizzle(selector);
        return nodes.reduce((html, node) => {
            return html + node.innerHTML;
        }, '');
    }

    /**
     * Check if page scrolled after pagination
     * @param {number} previousPageHeight
     * @returns {Promise}
     * @private
     */
    async _hasPageScrolled(previousPageHeight) {
        return this._actions.wait(/* @covignore */ () => {
            return document.body.scrollHeight;
        }, function(scrollHeight) {
            return scrollHeight > previousPageHeight;
        }, [], this._timeout);
    }

    /**
     * Checks if data has changed on the page
     * @param previousPageHtml
     * @returns {Promise}
     * @private
     */
    async _hasPageDataChanged(previousPageHtml) {
        return this._actions.wait(this._getPaginatePageHtml, (html) => {
            return html !== null && html !== previousPageHtml;
        }, [this._pageScope], this._timeout);
    }
}

module.exports = Paginator;
