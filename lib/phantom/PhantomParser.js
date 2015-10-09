var defaults = require('defaults');
var clone = require('clone');
var phantom = require('phantom');
var vow = require('vow');
var vowNode = require('vow-node');
var jsesc = require('jsesc');
var mkdir = require('mkdir-p');
var url = require('url');
var path = require('path');

var parser = require('redparser');
var RedParser = parser.RedParser;
var PaginatableParser = parser.PaginatableParser;
var debugLib = require('debug');
var debug = debugLib('PhantomParser');
var phantomError = debugLib('Phantom:error');
var debugParser = debugLib('RedParser');
var noop = function () {
};

var PORT = 13200;

function getPort () {
    PORT++;
    return PORT;
}

/**
 * Check function until it becomes true.
 *
 * @param {Function} check
 * @param {Number} timeout
 * @param {Number} interval
 * @param {Function} then
 */
function until (check, timeout, interval, then) {
    var start = Date.now();
    var checker = setInterval(function () {
        var diff = Date.now() - start;
        var res = check();
        if (res || diff > timeout) {
            clearInterval(checker);
            then(res);
        }
    }, interval);
}

/**
 * @typedef {object} PhantomParserOptions
 */
var DEFAULTS = {
    timeout: 1200000,
    interval: 50,
    weak: true,
    loadImages: true,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    proxy: null,
    proxyType: null,
    proxyAuth: null,
    cookiesFile: null,
    webSecurity: true,
    reportsDir: 'redparser_reports',
    phantomPath: null,
    takeScreenshots: false,
    screen: {
        width: 1080,
        height: 768
    }
};

/**
 * @class PhantomParser
 */
var PhantomParser = function (options) {
    /**
     * @type {PhantomParserOptions}
     */
    this.options = defaults(clone(options) || {}, DEFAULTS);


    this.phantomJS = null;
    this.page = null;
};

PhantomParser.prototype = {
    /**
     * Create a phantomjs instance.
     *
     * @returns {Promise}
     * @private
     */
    createInstance: function () {
        debug('.createInstance() creating Phantom instance');
        var deferred = vow.defer();
        var flags = [];
        flags.push('--load-images=' + this.options.loadImages);
        flags.push('--ignore-ssl-errors=' + this.options.ignoreSslErrors);
        flags.push('--ssl-protocol=' + this.options.sslProtocol);
        flags.push('--web-security=' + this.options.webSecurity);
        if (this.options.proxy !== null) {
            flags.push('--proxy=' + this.options.proxy);
        }
        if (this.options.proxyType !== null) {
            flags.push('--proxy-type=' + this.options.proxyType);
        }
        if (this.options.proxyAuth !== null) {
            flags.push('--proxy-auth=' + this.options.proxyAuth);
        }
        if (this.options.cookiesFile !== null) {
            flags.push('--cookies-file=' + this.options.cookiesFile);
        }

        // dnode options for compilation on windows
        var dnodeOpts = {};
        if (this.options.weak === false) {
            dnodeOpts = {weak: false};
        }

        // combine flags, options and callback into args
        var args = flags;
        args.push({
            port: this.options.port || getPort(),
            dnodeOpts: dnodeOpts,
            path: this.options.phantomPath,
            onExit: this.handleCrash.bind(this)
        });
        var self = this;
        args.push(function (instance) {
            self.phantomJS = instance;
            deferred.resolve(instance);
        });
        phantom.create.apply(phantom, args);

        // clear the timeout handler
        this.onTimeout = noop;

        return deferred.promise();
    },

    /**
     * Tear down a phantomjs instance.
     *
     * @private
     */
    tearDownInstance: function () {
        this.phantomJS.exit(0);
        debug('.tearDownInstance() tearing down');
    },

    /**
     * Set up a fresh phantomjs page.
     *
     * @returns {Promise}
     * @private
     */
    setup: function () {
        return this
            .createInstance()
            .then(this.createPage, this);
    },

    /**
     * Creates new page in phantom
     * @returns {Promise}
     */
    createPage: function () {
        debug('.setup() phantom instance created');
        var deferred = vow.defer();
        this.phantomJS.createPage(function (page) {
            this.page = page;
            debug('.setup() phantom page created');
            deferred.resolve(page);
        }.bind(this));
        return deferred.promise();
    },

    /**
     * Handles the phantom process ending/crashing unexpectedly.
     *
     * If an `onExit` handler has been bound then that will be called. Otherwise, the error will be re-thrown.
     *
     * @param {Number} code
     * @param {String} [signal]
     */
    handleCrash: function (code, signal) {
        // if a handler is defined, call it
        if (this.onExit) {
            this.onExit(code, signal);

            // otherwise, if we have a non-zero code we'll throw a better error message
            // than the `phantom` lib would.
        } else if (code !== 0) {
            var err = new Error('The PhantomJS process ended unexpectedly');
            err.code = code;
            err.signal = signal;
            throw err;
        }
    },


    /**
     * Check function on page until it becomes true.
     *
     * @param {Function} check
     * @param {Object} value
     * @param {Function} then
     * @private
     */
    untilOnPage: function (check, value, then) {
        var page = this.page;
        var condition = false;
        var args = [].slice.call(arguments).slice(3);
        var hasCondition = function () {
            args.unshift(function (res) {
                condition = res;
            });
            args.unshift(check);
            page.evaluate.apply(page, args);
            return condition === value;
        };
        until(hasCondition, this.options.timeout, this.options.interval, then);
    },

    /**
     * Go to url
     * @param url
     * @returns {Promise}
     * @private
     */
    goto: function (url) {
        var deferred = vow.defer();
        debug('.goto() url: ' + url);
        this.page.open(url, function (status) {
            debug('.goto() page loaded: ' + status);
            setTimeout(function () {
                deferred.resolve();
            }, 500);
        });

        return deferred.promise();
    },

    /**
     * Set the viewport.
     *
     * @returns {Promise}
     * @private
     */
    viewport: function () {
        var deferred = vow.defer();
        var width = this.options.screen.width;
        var height = this.options.screen.height;
        debug('.viewport() to ' + width + ' x ' + height);
        var viewport = {width: width, height: height};
        this.page.set('viewportSize', viewport, function () {
            deferred.resolve();
        });

        return deferred.promise();
    },

    /**
     * Inject libs which are required for parse process
     *
     * @private
     */
    inject: function () {
        debug('.inject()-ing parser libs');
        var files = [
            'node_modules/redparser/lib/parser/debug.js',
            'node_modules/redparser/lib/lodash.js',
            'node_modules/redparser/lib/parser/RedParser.js',
            'node_modules/redparser/lib/parser/PaginatableParser.js'
        ];
        files.forEach(function (file) {
            debug('injecting file %s', file);
            this.page.injectJs(file);
        }, this);
    },

    /**
     * Wait for various states.
     *
     * @param {Null|Number|String|Function} condition
     * @returns {Promise}
     * @private
     */
    wait: function (/* args */) {
        var deferred = vow.defer();
        var args = arguments;
        var self = this;

        if (typeof args[0] === 'string') {
            var selector = args[0];
            debug('.wait() for the element ' + selector);
            /**
             * @name elementPresent
             * @function
             * we lose the clojure when it goes to phantom, so we have to
             * force it with string concatenation and eval
             */
            eval("var elementPresent = function() {" +
                "  var element = document.querySelector('" + jsesc(selector) + "');" +
                "  return (element ? true : false);" +
                "};");
            this.untilOnPage(
                elementPresent,
                true,
                function (present) {
                    if (!present) {
                        var message = 'timeout elapsed before selector "' + selector + '" became present';
                        self.onTimeout(message);
                        deferred.reject(new Error(message));
                    }
                    else {
                        deferred.resolve();
                    }
                },
                selector
            );
        }
        // wait for on-page fn==value
        else if (typeof args[0] === 'function') {
            var fn = args[0];
            var value = args[1];
            debug('.wait() for fn==' + value);
            this.untilOnPage(
                fn,
                value,
                function (val) {
                    if (val !== value) {
                        var message = 'timeout elapsed before fn===' + value;
                        self.onTimeout(message);
                        deferred.reject(new Error(message));
                    }
                    else {
                        deferred.resolve();
                    }
                }
            );
        }

        return deferred.promise();
    },

    /**
     * Attach on phantom event
     * @param type
     * @param callback
     * @param {object} context
     * @returns {Promise}
     * @private
     */
    on: function (type, callback, context) {
        var deferred = vow.defer();

        if (context) {
            callback = callback.bind(context);
        }

        if (type === 'timeout') {
            this.onTimeout = callback;
            deferred.resolve();
        }
        // The onExit callback is special-cased here too
        else if (type === 'exit') {
            this.onExit = callback;
            deferred.resolve();
        }
        // resourceRequestStarted has a special function...
        else if (type === 'resourceRequestStarted') {
            var args = [].slice.call(arguments);
            args = args.slice(1, args.length - 1); // callback OR callback with args
            this.page.onResourceRequested.apply(this.page, args);
            deferred.resolve();
        }
        // All other events handled natively in phantomjs
        else {
            var pageEvent = 'on' + type.charAt(0).toUpperCase() + type.slice(1);
            this.page.set(pageEvent, callback, function () {
                deferred.resolve();
            });
        }

        return deferred.promise();
    },

    /**
     * Parse
     * @param {object} rule
     * @returns {Promise}
     * @private
     */
    _parse: function (rule) {
        debug('._parse() has called');
        var deferred = vow.defer();
        var DEBUG = [];
        if (process.env.DEBUG !== undefined) {
            DEBUG = process.env.DEBUG.split(',');
        }
        this.page.evaluate(
            function (rule, DEBUG) {
                window.DEBUG = DEBUG;
                window.__parser = new PaginatableParser();

                return window.__parser.parse(rule);
            },
            function (parsed) {
                deferred.resolve(parsed);
            },
            rule, DEBUG
        );

        return deferred.promise();
    },

    handlePhantomEvents: function () {
        return vow.all([
            this.on('timeout', function (msg) {
                debug(msg);
                this.tearDownInstance();
            }, this),
            this.on('exit', function (code, signal) {
                debug('Phantom exited with code ' + code + ' and signal ' + signal);
            }),
            this.on('error', function (msg, trace) {
                phantomError('%s, trace %o', msg, trace);
            }),
            this.on('consoleMessage', function (msg) {
                var regex = /^(\[RedParser])(.+)/i;
                var found = msg.match(regex);
                if (found !== null && found[2] !== undefined) {
                    debugParser(found[2].trim());
                } else {
                    debug('Phantom page message: ' + msg);
                }
            })
        ]);
    },

    /**
     * @param {string} host
     * @param {object} parsed
     * @param {object} rule
     * @param {object} pagination
     * @param {number} extraTries
     * @returns {Promise}
     */
    paginate: function (host, parsed, rule, pagination, extraTries) {
        return this
            .evaluatePagination(pagination)
            .then(this._takeScreenshot.bind(this, host, 'paginated.' + pagination.page))
            .then(this.getPage.bind(this, parsed, rule, pagination))
            .then(function (result) {
                debug('Paginated %o', result);
                var notEmpty = !!result.parsed.length;
                if (notEmpty || extraTries > 0) {
                    if (notEmpty) {
                        extraTries = 2;
                        Array.prototype.push.apply(parsed, result.parsed);
                        pagination.page = result.page + 1;
                    } else {
                        debug('Added extra try of paginate');
                        --extraTries;
                    }
                    return this.paginate(
                        host,
                        pagination.type === 'scroll' ?
                            parsed :
                            result.parsed,
                        rule,
                        pagination,
                        extraTries
                    )
                }
                return parsed;
            }, this);
    },

    /**
     * Async parse a page by specific url
     * @param {string} url
     * @param {object} rule
     * @param {object?} pagination
     * @param {string?} waitScope
     * @returns {Promise}
     */
    parse: function (url, rule, pagination, waitScope) {
        debug('.parseAsync() has called');
        var host = this._getHostName(url);

        waitScope = waitScope || rule.scope;
        debug('Parsing page ' + url);
        debug('Waiting for element with selector ' + waitScope);
        var self = this;
        return this
            .setup()
            .then(this.goto.bind(this, url))
            .then(this.handlePhantomEvents, this)
            .then(this.viewport, this)
            .then(this.wait.bind(this, waitScope))
            .then(this._takeScreenshot.bind(this, host, 'before_parse'))
            .then(this.inject, this)
            .then(this._parse.bind(this, rule))
            .then(function (parsed) {
                if (pagination === undefined) {
                    return parsed;
                }

                pagination = defaults(clone(pagination) || {}, {
                    wait: {
                        interval: 50,
                        timeout: 5000
                    },
                    page: 1
                });

                return this.paginate(host, parsed, rule, pagination, 0);
            }, this)
            .then(function (parsed) {
                self.tearDownInstance();
                return parsed;
            });
    },

    /**
     * Get current page after pagination
     *
     * @param {object} previousPage
     * @param {object} rule
     * @param {object} pagination
     * @returns {Promise}
     * @private
     */
    getPage: function (previousPage, rule, pagination) {
        debug('.getPage() has called');
        var deferred = vow.defer();

        var counted = 0;
        var self = this;
        var timeoutId = setInterval(
            function () {
                self.page.evaluate(
                    function (previousPage, rule, pagination) {
                        return window.__parser.hasPaginated(previousPage, rule, pagination);
                    },
                    function (pageResult) {
                        counted += pagination.wait.interval;

                        if (counted >= pagination.wait.timeout || pageResult !== false) {
                            clearInterval(timeoutId);
                            deferred.resolve(pageResult || {page: pagination.page, parsed: []});
                        }
                    },
                    previousPage, rule, pagination
                );
            },
            pagination.wait.interval
        );

        return deferred.promise();
    },

    /**
     * Paginate page inside phantom
     *
     * @param {object} pagination
     * @returns {Promise}
     * @private
     */
    evaluatePagination: function (pagination) {
        debug('.paginate() has called');
        var deferred = vow.defer();

        this.page.evaluate(
            function (pagination) {
                window.__parser.paginate(pagination);
            },
            function () {
                deferred.resolve();
            },
            pagination
        );

        return deferred.promise();
    },

    _takeScreenshot: function (host, fileName) {
        debug('._takeScreenshot()');
        if (!this.options.takeScreenshots) {
            debug('skip screenshot');
            return;
        }

        var screenShotFilePath = path.join(this.options.reportsDir, host);
        var screenShotFileName = path.join(screenShotFilePath, fileName + '.png');
        return vowNode
            .invoke(mkdir, screenShotFilePath)
            .then(function () {
                this.page.clipRect = {
                    left: 0,
                    top: 0,
                    width: this.options.screen.width,
                    height: this.options.screen.height
                };
                this.page.render(screenShotFileName);
            }, this);
    },

    /**
     * @param {string }uri
     * @returns {string}
     * @private
     */
    _getHostName: function (uri) {
        var parsed = url.parse(uri);
        return parsed.hostname;
    }
};

module.exports = PhantomParser;
