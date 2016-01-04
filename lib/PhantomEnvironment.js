'use strict';

var _ = require('lodash'),
    Environment = require('./Environment'),
    debugLib = require('debug'),
    debug = debugLib('PhantomEnvironment'),
    phantomError = debugLib('Phantom:error'),
    debugParser = debugLib('RedParser'),
    phantom = require('phantom'),
    path = require('path'),
    mkdir = require('mkdir-p'),
    url = require('url'),
    vowNode = require('vow-node'),
    vow = require('vow'),
    fs = require('fs');

/**
 * @typedef {object} Proxy
 * @property {string} host
 * @property {number} port
 * @property {?string} username
 * @property {?string} password
 */

/**
 * @typedef {object} Resources
 * @property {?Array.<string>} allowed Only `allowed` resources will be loaded. Have higher priority than `denied`
 * @property {?Array.<string>} denied All except `denied` resources will be loaded
 */

/**
 * @typedef {object} Screen
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {object} PhantomEnvironmentOptions
 * @property {?number} timeout
 * @property {?boolean} weak
 * @property {?boolean} loadImages
 * @property {?boolean} ignoreSslErrors
 * @property {?string} sslProtocol
 * @property {?string} cookiesFile
 * @property {?boolean} webSecurity
 * @property {?string} phantomPath
 *
 * @property {?string} snapshot perform snapshot during parsing
 * @property {?string} snapshotDir directory for snapshots
 * @property {?Proxy|Array.<Proxy>} proxy single proxy or proxy list
 * @property {?function} proxyRotator proxy rotator function(proxyList, currentProxy) with context of this env. function should return Proxy from the list
 * @property {?string|Array.<string>} userAgent user agent or list of agents for setting to phantom
 * @property {?Screen} screen screen dimensions
 * @property {?Resources} resources white and black lists for loading resources on the page
 */
var defaultOptions = {
    // Phantom options
    timeout: 60000,
    weak: true,
    loadImages: false,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    cookiesFile: null,
    webSecurity: true,
    phantomPath: null,

    // Custom environment options
    snapshot: false,
    snapshotDir: 'snapshots',
    proxy: null,
    proxyRotator: null,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12',
    screen: {
        width: 1080,
        height: 768
    },
    resources: {
        allowed: null,
        denied: null
    }
};

var port = 13200;

/**
 * @param {PhantomEnvironmentOptions} options
 * @constructor
 */
function PhantomEnvironment (options) {
    debug('Initializing...');
    Environment.call(this, options);

    this._options = _.defaults(_.clone(options) || {}, defaultOptions);
    this._proxyCurrent = null;
    this._url = options.url;

    if (!this._url) {
        throw new Error('You must pass `url` to PhantomEnvironment');
    }

    this._phantomJS = null;
    this._page = null;
    this._navigationActions = [];
    this._requestingActions = [];
}

PhantomEnvironment.prototype = _.create(Environment.prototype, /**@lends PhantomEnvironment*/{
    prepare: function () {
        debug('Preparing...');
        return Environment.prototype.prepare
            .call(this)
            .then(this._setup, this)
            .then(this._setViewport, this)
            .then(this._setUserAgent, this)
            .then(this._handlePhantomEvents, this)
            .then(this._rotateProxy, this)
            .then(this._navigateTo.bind(this, this._url))
            .then(this._inject, this);
    },

    evaluateJs: function () {
        var deferred = vow.defer(),
            page = this._page,
            args = Array.prototype.slice.call(arguments, 0);

        var evalFunc = args.pop();
        if (typeof evalFunc !== 'function') {
            throw new Error('You must pass function as last argument to PhantomEnvironment.evaluateJs');
        }
        args.unshift(evalFunc, deferred.resolve.bind(deferred));

        page.evaluate.apply(page, args);
        return deferred.promise();
    },

    /**
     * Take screen snapshot
     * @param {string} fileName
     * @returns {Promise}
     */
    snapshot: function (fileName) {
        var options = this._options;
        if (!options.snapshot) {
            return vow.resolve();
        }

        var screenShotFilePath = path.join(options.snapshotDir, this._getHostName(this._url));
        var screenShotFileName = path.join(screenShotFilePath, fileName + '.png');
        debug('.snapshot() to %s', screenShotFileName);
        return vowNode
            .invoke(mkdir, screenShotFilePath)
            .then(function () {
                this._page.clipRect = {
                    left: 0,
                    top: 0,
                    width: options.screen.width,
                    height: options.screen.height
                };
                this._page.render(screenShotFileName);
            }, this)
            .then(() => {
                const deferred = vow.defer();

                const interval = setInterval(() => {
                    if (fs.statSync(screenShotFilePath).size) {
                        clearInterval(interval);
                        clearTimeout(timeout);
                        deferred.resolve();
                    }
                }, 20);

                const timeout = setTimeout(() => {
                    clearInterval(interval);
                    deferred.reject(new Error('Snapshot timeout'));
                }, 500);

                return deferred.promise();
            });
    },

    waitForPage: function (timeout) {
        timeout = timeout || 5000;

        var deferred = vow.defer();
        var timeoutId = setTimeout(function () {
            debug('Timeout %s has reached on page load', timeout);
            this._navigationActions = [];
            deferred.reject(new Error('Page navigation timeout'));
        }.bind(this), timeout);

        this._navigationActions.push(function (err) {
            clearTimeout(timeoutId);
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });
        debug('Added page load callback');

        return deferred.promise().then(this._inject, this);
    },

    waitForQuery: function (uri, timeout) {
        timeout = timeout || 5000;

        var deferred = vow.defer();
        var timeoutId = setTimeout(function () {
            debug('Timeout %s has reached for waiting query %s', timeout, uri);
            this._requestingActions = [];
            deferred.reject(new Error('Waiting request timeout'));
        }.bind(this), timeout);

        this._requestingActions.push({
            pattern: uri,
            fn(err, results) {
                clearTimeout(timeoutId);
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(results);
                }
            }
        });
        debug('Added request callback');

        return deferred.promise();
    },

    back: function () {
        debug('Back');
        this._page.goBack();
        return vow.resolve();
    },

    mousedown: function (selector) {
        return this._getElementPosition(selector)
            .then(function (position) {
                this._page.sendEvent('mousedown', position.x, position.y);
            }, this);
    },

    mouseup: function (selector) {
        return this._getElementPosition(selector)
            .then(function (position) {
                this._page.sendEvent('mouseup', position.x, position.y);
            }, this);
    },

    _getElementPosition: function (selector) {
        return this.evaluateJs(selector, /* @covignore */ function (selector) {
            var node = Sizzle(selector)[0];
            if (!node) {
                throw new Error('Cannot get position, node is not found');
            }

            var rect = node.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }).then(function (position) {
            debug('Element position is %o', position);
            return position;
        });
    },

    /**
     * Set up a fresh phantomjs page.
     * @returns {Promise}
     * @private
     */
    _setup: function () {
        return this._createInstance().then(this._createPage, this);
    },

    /**
     * Create a phantomjs instance.
     * @returns {Promise}
     * @private
     */
    _createInstance: function () {
        var options = this._options,
            deferred = vow.defer(),
            flags = [];
        debug('.createInstance() creating Phantom instance with options %o', options);
        flags.push('--load-images=' + options.loadImages);
        flags.push('--ignore-ssl-errors=' + options.ignoreSslErrors);
        flags.push('--ssl-protocol=' + options.sslProtocol);
        flags.push('--web-security=' + options.webSecurity);
        if (options.cookiesFile !== null) {
            flags.push('--cookies-file=' + options.cookiesFile);
        }

        // dnode options for compilation on windows
        var dnodeOpts = {};
        if (options.weak === false) {
            dnodeOpts = {weak: false};
        }

        // combine flags, options and callback into args
        var args = flags;
        args.push({
            port: options.port || this._getPort(),
            dnodeOpts: dnodeOpts,
            path: options.phantomPath,
            onExit: this._handleCrash.bind(this)
        });
        var self = this;
        args.push(function (instance) {
            self._phantomJS = instance;
            deferred.resolve(instance);
        });
        phantom.create.apply(phantom, args);
        return deferred.promise();
    },

    _getPort: function () {
        port++;
        return port;
    },

    /**
     * Creates new page in phantom
     * @returns {Promise}
     */
    _createPage: function () {
        debug('._createPage() has called');
        var deferred = vow.defer();
        this._phantomJS.createPage(function (page) {
            this._page = page;
            debug('._createPage() phantom page created');
            deferred.resolve(page);
        }.bind(this));
        return deferred.promise();
    },

    /**
     * Tear down a phantomjs instance.
     * @private
     */
    tearDown: function () {
        debug('._tearDownInstance() tearing down');
        var phantom = this._phantomJS;
        if (!this._phantomJS.process) {
            debug('Phantom process already exited, not killing');
            return;
        }

        var pid = phantom.process.pid;

        debug('Terminating phantom process gracefully, pid: ', pid);
        if (this._page) {
            this._page.close();
        }
        phantom.exit();

        setTimeout(function () {
            debug('Checking if process is still alive, pid: %s', pid);
            if (phantom.process != null) {
                debug('Terminating phantom process with SIGTERM, pid: %s', pid);
                phantom.process.kill('SIGTERM');
                setTimeout(function () {
                    debug('Checking if process is still alive after SIGTERM, pid: %s', pid);
                    if (phantom.process != null) {
                        debug('Terminating phantom process with SIGKILL, pid: %s', pid);
                        phantom.process.kill('SIGKILL');
                    }
                }, 100);
            }
        }, 100);
    },

    /**
     * Handles the phantom process ending/crashing unexpectedly.
     * If an `onExit` handler has been bound then that will be called. Otherwise, the error will be re-thrown.
     * @param {Number} code
     * @param {String} [signal]
     */
    _handleCrash: function (code, signal) {
        // if a handler is defined, call it
        if (this._onExit) {
            this._onExit(code, signal);

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
     * Go to url
     * @param url
     * @returns {Promise}
     * @private
     */
    _navigateTo: function (url) {
        var deferred = vow.defer();
        debug('.goto() url: ' + url);
        var self = this;
        this._page.open(url, function (status) {
            debug('.goto() page loaded: ' + status);
            if (status === 'success') {
                return deferred.resolve();
            }

            self._rotateProxy()
                .then(function (proxy) {
                    // cannot set new proxy
                    if (proxy === null) {
                        return deferred.reject(new Error('Page was not loaded'));
                    }

                    // one more attempt to open page through the new proxy
                    return this._navigateTo(url);
                }, self);
        });

        return deferred.promise();
    },

    /**
     * Set the viewport.
     *
     * @returns {Promise}
     * @private
     */
    _setViewport: function () {
        var deferred = vow.defer();
        var screen = this._options.screen;
        if (Array.isArray(screen)) {
            screen = _.sample(screen);
        }
        var width = screen.width;
        var height = screen.height;
        debug('.viewport() to ' + width + ' x ' + height);
        var viewport = {width: width, height: height};
        this._page.set('viewportSize', viewport, function () {
            deferred.resolve();
        });

        return deferred.promise();
    },

    /**
     * Set the user agent.
     *
     * @returns {Promise}
     * @private
     */
    _setUserAgent: function () {
        var deferred = vow.defer();
        var userAgent = this._options.userAgent;
        if (Array.isArray(userAgent)) {
            userAgent = _.sample(this._options.userAgent);
        }
        debug('.userAgent() to ' + userAgent);
        this._page.set('settings.userAgent', userAgent, function () {
            deferred.resolve();
        });

        return deferred.promise();
    },

    /**
     * Set a proxy from the proxy list (unset previous one)
     *
     * @returns {Promise}
     * @private
     */
    _rotateProxy: function () {
        var deferred = vow.defer();
        var proxy = this._options.proxy;
        var currentProxy = this._proxyCurrent;
        if (proxy == undefined) {
            deferred.resolve(null);
            return deferred.promise();
        }
        if (Array.isArray(proxy)) {
            this._removeUnavailableProxy();
            proxy = typeof this._options.proxyRotator === 'function' ?
                this._options.proxyRotator.call(this, proxy, currentProxy) :
                _.sample(proxy);

            if (proxy == undefined) {
                throw new Error('No proxy found');
            }
        }
        debug('._rotateProxy() to %o', proxy);
        var self = this;

        this._phantomJS.setProxy(proxy.host, proxy.port, 'manual', proxy.username, proxy.password, function () {
            self._proxyCurrent = proxy;
            deferred.resolve(proxy);
        });

        return deferred.promise();
    },

    /**
     * Remove from proxy list one which doesn't work
     *
     * @returns {?Proxy}
     * @private
     */
    _removeUnavailableProxy: function () {
        var current = this._proxyCurrent;
        if (!Array.isArray(this._options.proxy) || this._options.proxy.length === 0 || current === null) {
            return null;
        }

        debug('._removeUnavailableProxy()');
        var index = this._options.proxy.findIndex(function (item) {
            return item.host === current.host && item.port === current.port;
        });
        var proxy = null;
        if (index !== -1) {
            // cut off old used proxy from the list
            proxy = this._options.proxy.splice(index, 1);
        }
        return Array.isArray(proxy) ? proxy.pop() : null;
    },

    /**
     * Inject libs which are required for parse process
     *
     * @private
     */
    _inject: function () {
        debug('.inject()-ing parser libs');
        var files = [
            'vendor/sizzle.min.js'
        ];
        files.forEach(function (file) {
            debug('injecting file %s', file);
            this._page.injectJs(path.join(__dirname, '..', file));
        }, this);
        return vow.resolve();
    },

    /**
     * Attach on phantom event
     * @param type
     * @param callback
     * @param {object} context
     * @returns {Promise}
     * @private
     */
    _on: function (type, callback, context) {
        var deferred = vow.defer();

        if (context) {
            callback = callback.bind(context);
        }

        if (type === 'timeout') {
            deferred.resolve();
        }
        // The onExit callback is special-cased here too
        else if (type === 'exit') {
            this._onExit = callback;
            deferred.resolve();
        }
        // resourceRequestStarted has a special function...
        else if (type === 'resourceRequested') {
            var args = [].slice.call(arguments);
            args = args.slice(3);
            this._page.onResourceRequested(callback, /* @covignore */ function (requestData) {
                // todo: decide, remove or leave
                // debug('Resource requested %s', requestData.url);
            }, args[0], args[1]);
            deferred.resolve();
        }
        // All other events handled natively in phantomjs
        else {
            var pageEvent = 'on' + type.charAt(0).toUpperCase() + type.slice(1);
            this._page.set(pageEvent, callback, function () {
                deferred.resolve();
            });
        }

        return deferred.promise();
    },

    _handlePhantomEvents: function () {
        return vow.all([
            this._on('timeout', function (msg) {
                debug(msg);
                this.tearDown();
            }, this),
            this._on('exit', function (code, signal) {
                debug('Phantom exited with code ' + code + ' and signal ' + signal);
                delete this._phantomJS.process;
            }),
            this._on('error', function (msg, trace) {
                phantomError('%s, trace %o, file %s errbacks', msg, trace, this._errbacks.length);
                this._errbacks.forEach(function (errback) {
                    errback(msg, trace);
                });
                this._errbacks = [];
            }.bind(this)),
            this._on('consoleMessage', function (msg) {
                var regex = /^(\[GooseParser])(.+)/i;
                var found = msg.match(regex);
                if (found !== null && found[2] !== undefined) {
                    debugParser(found[2].trim());
                } else {
                    debug('Phantom page message: ' + msg);
                }
            }),
            this._on('navigationRequested', function (url) {
                debug('Navigation to %s', url);
                let i = 0;
                const actions = this._requestingActions;
                while (i < actions.length) {
                    const action = actions[i];
                    i++;
                    if (url.match(action.pattern)) {
                        actions.shift();
                        i++;
                        action.fn(null, url);
                    }
                }
            }.bind(this)),
            this._on('resourceRequested', /* @covignore */ function (requestData, request, allowedUrls, blockedUrls) {
                var url = requestData.url;
                var hasAllowedUrls = Array.isArray(allowedUrls) && allowedUrls.length > 0;
                var hasBlockedUrls = Array.isArray(blockedUrls) && blockedUrls.length > 0;
                var allowed = !hasAllowedUrls || allowedUrls.some(function (urlPattern) {
                        return url.match(urlPattern) !== null
                    });

                var blocked = false;
                if (!hasAllowedUrls && hasBlockedUrls) {
                    blocked = blockedUrls.some(function (urlPattern) {
                        return url.match(urlPattern) !== null;
                    });
                }
                if (!allowed || blocked) {
                    console.log('Resource ' + requestData.url + ' was aborted');
                    request.abort();
                }
            }, null, this._options.resources.allowed, this._options.resources.denied),
            this._on('loadFinished', function (status) {
                debug('Page loaded with status %s, fire %s callbacks', status, this._navigationActions.length);
                var callback;
                while (callback = this._navigationActions.shift()) {
                    callback.call(this, status === 'success' ? null : new Error('Page is not loaded'));
                }
            }.bind(this))
        ]);
    },

    /**
     * @param {string} uri
     * @returns {string}
     * @private
     */
    _getHostName: function (uri) {
        var parsed = url.parse(uri);
        return parsed.hostname;
    }
});

module.exports = PhantomEnvironment;
