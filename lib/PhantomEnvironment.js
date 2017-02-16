'use strict';

const _ = require('lodash'),
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
 * @typedef {object} ProxyIndicator
 * @property {string} type
 * @property {string} level Possible levels - high, medium, low
 */

/**
 * type=redirect
 * @typedef {ProxyIndicator} RedirectProxyIndicator
 * @property {string} url
 */

/**
 * type=responseCode
 * @typedef {ProxyIndicator} ResponceCodeProxyIndicator
 * @property {number} code
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
 * @property {Array.<ProxyIndicator>} proxyIndicators Indicators which say that proxy became unreachable
 * @property {?function} proxyRotator proxy rotator function(proxyList, currentProxy) with context of this env. function should return Proxy from the list
 * @property {?string|Array.<string>} userAgent user agent or list of agents for setting to phantom
 * @property {?Screen} screen screen dimensions
 * @property {?Resources} resources white and black lists for loading resources on the page
 */
const defaultOptions = {
    // Phantom options
    timeout: 60 * 1000,
    weak: true,
    loadImages: false,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    cookiesFile: null,
    webSecurity: false,
    phantomPath: null,

    // Custom environment options
    snapshot: false,
    snapshotDir: 'snapshots',
    proxy: null,
    proxyRotator: null,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12',
    screen: {
        width: 1440,
        height: 900
    },
    resources: {
        allowed: null,
        denied: null
    }
};

let port = 13200;

/**
 * @param {PhantomEnvironmentOptions} options
 * @constructor
 */
function PhantomEnvironment(options) {
    debug('Initializing...');
    Environment.call(this, options);

    this._options = _.defaults(_.clone(options) || {}, defaultOptions);
    this._proxy = this._options.proxy;
    this._proxyIndicators = this._options.proxyIndicators || [];
    this._proxyErrors = [];
    this._proxyCurrent = null;
    this._url = options.url;
    this._redirectUrls = [];

    if (!this._url) {
        throw new Error('You must pass `url` to PhantomEnvironment');
    }

    this._phantomJS = null;
    this._page = null;
    this._navigationActions = [];
    this._requestingActions = [];
    this._exitHanlers = [];
    this._browserEnvInjected = false;
}

PhantomEnvironment.prototype = _.create(Environment.prototype, /**@lends PhantomEnvironment*/{
    prepare() {
        debug('Preparing...');
        return Environment.prototype.prepare
            .call(this)
            .then(this._setup, this)
            .then(this._setViewport, this)
            .then(this._setUserAgent, this)
            .then(this._setTimeout, this)
            .then(this._handlePhantomEvents, this)
            .then(this._rotateProxy, this)
            .then(this._navigateTo.bind(this, this._url))
            .then(this._validateProxy, this)
            .then(this._inject, this);
    },

    setProxy(proxy) {
        this._proxy = proxy;
        return this;
    },

    getProxy() {
        return this._proxy;
    },

    getOption(name) {
        return this._options[name];
    },

    evaluateJs() {
        var deferred = vow.defer(),
            page = this._page,
            args = Array.prototype.slice.call(arguments, 0);

        var evalFunc = args.pop();
        if (typeof evalFunc !== 'function') {
            throw new Error('You must pass function as last argument to PhantomEnvironment.evaluateJs');
        }
        args.unshift(evalFunc, results => deferred.resolve(results));

        page.evaluate.apply(page, args);
        return deferred.promise();
    },

    /**
     * Take screen snapshot
     * @param {string} fileName
     * @returns {Promise}
     */
    snapshot(fileName) {
        var options = this._options;
        if (!options.snapshot) {
            return vow.resolve();
        }

        var screenShotFilePath = path.join(options.snapshotDir, this._getHostName(this._url));
        var screenShotFileName = path.join(screenShotFilePath, fileName + '.png');
        debug('.snapshot() to %s', screenShotFileName);
        return vowNode
            .invoke(mkdir, screenShotFilePath)
            .then(() => {
                const windowSize = {
                    left: 0,
                    top: 0,
                    width: options.screen.width,
                    height: options.screen.height
                };
                this._page.clipRect = windowSize;
                debug('Doing snapshot with window size %o, filepath %s', windowSize, screenShotFileName);
                this._page.render(screenShotFileName);
            })
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

    waitForPage(timeout) {
        timeout = timeout || 5000;

        var deferred = vow.defer();
        var timeoutId = setTimeout(() => {
            debug('Timeout %s has reached on page load', timeout);
            this._navigationActions = [];
            deferred.reject(new Error('Page navigation timeout'));
        }, timeout);

        this._navigationActions.push(err => {
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

    waitForQuery(uri, timeout) {
        timeout = timeout || 5000;

        var deferred = vow.defer();
        var timeoutId = setTimeout(() => {
            debug('Timeout %s has reached for waiting query %s', timeout, uri);
            this._requestingActions = [];
            deferred.reject(new Error('Waiting request timeout'));
        }, timeout);

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

    back() {
        debug('Back');
        this._page.goBack();
        return vow.resolve();
    },

    mouseClick(selector) {
        return this._getElementPosition(selector)
            .then(position => {
                this._page.sendEvent('mousedown', position.x, position.y);
                return position;
            })
            .then(position => {
                this._page.sendEvent('mouseup', position.x, position.y);
            });
    },

    mousedown(selector) {
        return this._getElementPosition(selector)
            .then(position => {
                this._page.sendEvent('mousedown', position.x, position.y);
            });
    },

    mouseup(selector) {
        return this._getElementPosition(selector)
            .then(position => {
                this._page.sendEvent('mouseup', position.x, position.y);
            });
    },

    _getElementPosition(selector) {
        return this.evaluateJs(selector, /* @covignore */ function(selector) {
            var node = Sizzle(selector)[0];
            if (!node) {
                return null;
            }

            var rect = node.getBoundingClientRect();
            return {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
        }).then(position => {
            if (!position) {
                throw new Error('Position of element ' + selector + ' was not found');
            }
            debug('Element position is %o', position);
            return position;
        });
    },

    /**
     * Set up a fresh phantomjs page.
     * @returns {Promise}
     * @private
     */
    _setup() {
        return this._createInstance().then(this._createPage, this);
    },

    /**
     * Create a phantomjs instance.
     * @returns {Promise}
     * @private
     */
    _createInstance() {
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
            onExit: this._handleExit.bind(this)
        });
        args.push(instance => {
            this._phantomJS = instance;
            deferred.resolve(instance);
        });
        phantom.create.apply(phantom, args);
        return deferred.promise();
    },

    _getPort() {
        port++;
        return port;
    },

    /**
     * Creates new page in phantom
     * @returns {Promise}
     */
    _createPage() {
        debug('._createPage() has called');
        var deferred = vow.defer();
        this._phantomJS.createPage(page => {
            this._page = page;
            debug('._createPage() phantom page created');
            deferred.resolve(page);
        });
        return deferred.promise();
    },

    /**
     * Tear down a phantomjs instance.
     */
    tearDown() {
        debug('._tearDownInstance() tearing down');
        var phantom = this._phantomJS;
        if (!phantom || !phantom.process) {
            debug('Phantom process already exited, not killing');
            return vow.resolve();
        }

        var deferred = vow.defer();
        var pid = phantom.process.pid;

        debug('Terminating phantom process gracefully, pid: ', pid);
        if (this._page) {
            this._page.close();
            delete this._page;
        }

        phantom.exit();

        const timeout = setTimeout(() => {
            const i = this._exitHanlers.indexOf(resolver);
            if (i !== -1) {
                this._exitHanlers.splice(i, 1);
            }

            debug('phantom time is out, kill it and go ahead');
            if (phantom.process) {
                phantom.process.kill('SIGKILL');
            }

            deferred.resolve();
        }, 5000); // 5 sec to die

        function resolver() {
            clearTimeout(timeout);
            deferred.resolve();
        }

        this._exitHanlers.push(resolver);

        delete this._phantomJS;
        return deferred.promise();
    },

    /**
     * Handles the phantom process ending/crashing unexpectedly.
     * If an `onExit` handler has been bound then that will be called. Otherwise, the error will be re-thrown.
     * @param {Number} code
     * @param {String} [signal]
     */
    _handleExit(code, signal) {
        debug('Phantom exited with code ' + code + ' and signal ' + signal);
        //delete this._phantomJS.process;

        // otherwise, if we have a non-zero code we'll throw a better error message
        // than the `phantom` lib would.
        if (code !== 0) {
            var err = new Error('The PhantomJS process ended unexpectedly');
            err.code = code;
            err.signal = signal;
            //throw err;
        }

        this._exitHanlers.forEach(handler => handler(code));
        this._exitHanlers = [];
    },

    /**
     * Go to url
     * @param url
     * @returns {Promise}
     * @private
     */
    _navigateTo(url) {
        var deferred = vow.defer();
        debug('.goto() url: ' + url);
        this._page.open(url, status => {
            debug('.goto() page loaded: ' + status);
            if (status === 'success') {
                return deferred.resolve();
            }

            this._rotateProxy()
                .then(proxy => {
                    // cannot set new proxy
                    if (proxy === null) {
                        return deferred.reject(new Error('Page ' + this._url + ' was not loaded'));
                    }

                    // one more attempt to open page through the new proxy
                    return this._navigateTo(url);
                }, (e) => deferred.reject(e));
        });

        return deferred.promise();
    },

    /**
     * Set the viewport.
     *
     * @returns {Promise}
     * @private
     */
    _setViewport() {
        var deferred = vow.defer();
        var screen = this._options.screen;
        if (Array.isArray(screen)) {
            screen = _.sample(screen);
        }
        var width = screen.width;
        var height = screen.height;
        debug('.viewport() to ' + width + ' x ' + height);
        var viewport = {width: width, height: height};
        this._options.screen = viewport;
        this._page.set('viewportSize', viewport, () => deferred.resolve());

        return deferred.promise();
    },

    /**
     * Set the user agent.
     *
     * @returns {Promise}
     * @private
     */
    _setUserAgent() {
        var deferred = vow.defer();
        var userAgent = this._options.userAgent;
        if (Array.isArray(userAgent)) {
            userAgent = _.sample(this._options.userAgent);
        }
        debug('.userAgent() to ' + userAgent);
        this._page.set('settings.userAgent', userAgent, () => deferred.resolve());

        return deferred.promise();
    },

    /**
     * Set timeout.
     *
     * @returns {Promise}
     * @private
     */
    _setTimeout() {
        var deferred = vow.defer();
        var timeout = this._options.timeout;
        debug('.timeout() to ' + timeout);
        this._page.set('settings.resourceTimeout', timeout, () => deferred.resolve());

        return deferred.promise();
    },

    /**
     * @param {Error} error
     */
    addProxyError(error) {
        this._proxyErrors.push(error);
    },

    /**
     * @returns {Array.<Error>}
     */
    getProxyErrors() {
        return this._proxyErrors;
    },

    /**
     * @param type
     * @returns {Array.<ProxyIndicator>}
     */
    getProxyIndicators(type) {
        return this._proxyIndicators.filter((item) => {
            return item.type === type;
        });
    },

    /**
     * @returns {Promise}
     * @private
     */
    _validateProxy() {
        return this.getProxyErrors().length === 0 ?
            Promise.resolve() :
            Promise.reject(this.getProxyErrors().pop());
    },

    /**
     * @param {ProxyIndicator} proxyIndicator
     * @returns {Error}
     */
    createProxyError(proxyIndicator) {
        var msg;
        switch (proxyIndicator.type) {
            case 'redirect':
                msg = 'Proxy matched redirect';
                break;
            case 'responseCode':
                msg = 'Proxy matched response code';
                break;
            case 'captcha':
                msg = 'Captcha handled';
                break;
            default:
                throw new Error('Unsupported proxyIndicator');
        }
        const err = new Error(msg);
        err.proxyIndicator = proxyIndicator.type;
        err.proxyLevel = proxyIndicator.level || 'medium';

        return err;
    },

    /**
     * Set a proxy from the proxy list (unset previous one)
     *
     * @returns {Promise}
     * @private
     */
    _rotateProxy() {
        var proxy = this._proxy;
        var currentProxy = this._proxyCurrent;
        if (proxy == undefined) {
            return vow.resolve(null);
        }
        if (Array.isArray(proxy)) {
            this._removeUnavailableProxy();
            var promise = (typeof this._options.proxyRotator === 'function') ?
                this._options.proxyRotator(proxy, currentProxy) :
                vow.resolve(_.sample(proxy));

            return promise
                .then(foundProxy => {
                    this._proxyErrors = [];
                    if (foundProxy == undefined) {
                        throw new Error('No proxy found');
                    }
                    return this._applyProxy(foundProxy);
                });
        }

        return this._applyProxy(proxy);
    },

    /**
     * Apply proxy to Phantom
     * @private
     */
    _applyProxy(proxy) {
        const deferred = vow.defer();
        this._phantomJS.setProxy(proxy.host, proxy.port, 'manual', proxy.username, proxy.password, () => {
            debug('Proxy applied %o', proxy);
            this._proxyCurrent = proxy;
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
    _removeUnavailableProxy() {
        var current = this._proxyCurrent;
        if (!Array.isArray(this._proxy) || this._proxy.length === 0 || current === null) {
            return null;
        }

        debug('._removeUnavailableProxy()');
        var index = this._proxy.findIndex(item => {
            return item.host === current.host && item.port === current.port;
        });
        var proxy = null;
        if (index !== -1) {
            // cut off old used proxy from the list
            proxy = this._proxy.splice(index, 1);
        }
        return Array.isArray(proxy) ? proxy.pop() : null;
    },

    /**
     * Inject libs which are required for parse process
     *
     * @private
     */
    _inject() {
        debug('.inject()-ing parser libs');
        var files = [
            'vendor/sizzle.min.js',
            'vendor/xhr.sniffer.js',
        ];
        return this._injectFiles(files);
    },

    _injectFiles: function(files) {
        files.forEach(file => {
            debug('injecting file %s', file);
            this._page.injectJs(path.join(__dirname, '..', file));
        });
        return vow.resolve();
    },

    injectBrowserEnv() {
        if (this._browserEnvInjected) {
            return vow.resolve();
        }

        debug('.inject()-ing browser env libs');
        return this._injectFiles([
            'build/browser.bundle.js'
        ]);
    },

    /**
     * @param {string} [urlPattern]
     * @returns {boolean}
     */
    hasRedirect(urlPattern) {
        if (urlPattern === undefined) {
            return this._redirectUrls.length > 0;
        }
        return this._redirectUrls.some(function(url) {
            return url.match(urlPattern) !== null;
        });
    },

    _handlePhantomEvents() {
        const page = this._page;

        page.set('onError', (msg, trace) => {
            phantomError('%s, trace %o, fire %s errbacks', msg, trace, this._errbacks.length);
            // this._errbacks.splice(0).forEach(errback => errback(msg, trace));
        });

        // todo: make it workable
        page.set('onConsoleMessage', msg => {
            const regex = /^(\[GooseParser])(.+)/i;
            const found = msg.match(regex);

            if (found) {
                debugParser(found[2].trim());
            } else {
                debug('Phantom page message: ' + msg);
            }
        });

        page.set('onNavigationRequested', url => {
            debug('Navigation to %s', url);
            let i = 0;
            const actions = this._requestingActions;
            while (i < actions.length) {
                const action = actions[i];
                if (url.match(action.pattern)) {
                    actions.shift();
                    action.fn(null, url);
                } else {
                    i++;
                }
            }
        });

        page.set('onLoadFinished', status => {
            debug('Page loaded with status %s, fire %s callbacks', status, this._navigationActions.length);
            this._navigationActions.splice(0).forEach(callback => {
                callback.call(this, status === 'success' ? null : new Error('Page is not loaded'));
            });
        });

        page.set('onResourceError', resourceError => {
            debug('Navigation error %s %s', resourceError.url, resourceError.errorString);
            const matched = this.getProxyIndicators('responseCode').find((item) => {
                return item.code === resourceError.status;
            });
            if (matched) {
                this.addProxyError(this.createProxyError(matched));
            }
        });

        page.onResourceRequested(/* @covignore */ function(requestData, request, allowedUrls, blockedUrls) {
            var url = requestData.url;
            var hasAllowedUrls = Array.isArray(allowedUrls) && allowedUrls.length > 0;
            var hasBlockedUrls = Array.isArray(blockedUrls) && blockedUrls.length > 0;
            var allowed = !hasAllowedUrls || allowedUrls.some(function(urlPattern) {
                    return url.match(urlPattern) !== null
                });

            var blocked = false;
            if (!hasAllowedUrls && hasBlockedUrls) {
                blocked = blockedUrls.some(function(urlPattern) {
                    return url.match(urlPattern) !== null;
                });
            }

            if (!allowed || blocked) {
                console.log('[GooseParser] Resource ' + requestData.url.substr(0, 30) + ' was aborted');
                request.abort();
            }
        }, requestData => {
            // todo: decide, remove or leave
            // debug('Resource requested %s, %o', requestData.url, requestData);
        }, this._options.resources.allowed, this._options.resources.denied);

        page.set('onResourceReceived', (resource) => {
            // debug('Resource recieved %o', resource);
            // redirect has occurred
            if ([302, 301].indexOf(resource.status) !== -1) {
                const redirectUrl = this._extractRedirectUrl(resource) || '';

                // if current url matches with this._url or with the last redirect url from this._redirectUrls
                if (
                    redirectUrl &&
                    (
                        resource.url === this._url ||
                        resource.url === this._redirectUrls[this._redirectUrls.length - 1]
                    )
                ) {
                    debug('Redirect to %s', redirectUrl);
                    this._redirectUrls.push(redirectUrl);
                }
                const matched = this.getProxyIndicators('redirect').find((item) => {
                    return redirectUrl.match(item.url);
                });
                if (matched) {
                    this.addProxyError(this.createProxyError(matched));
                }
            }
        });
    },

    /**
     * @param {object} resource
     * @returns {string}
     * @private
     */
    _extractRedirectUrl(resource) {
        let redirectUrl;
        if (resource.redirectUrl) {
            redirectUrl = resource.redirectUrl;
        }
        else {
            const locationHeader = (resource.headers || []).find((header) => {
                return header.name && header.name.toLowerCase() === 'location';
            });

            if (locationHeader && locationHeader.value) {
                redirectUrl = locationHeader.value;
            }
        }

        return redirectUrl ? this._getRedirectUrl(resource.url, redirectUrl) : '';
    },

    /**
     * @param {string} uri
     * @returns {string}
     * @private
     */
    _getHostName(uri) {
        var parsed = url.parse(uri);
        return parsed.hostname;
    },

    /**
     * @param {string} currentUrl
     * @param {string} redirectUri
     * @returns {string}
     * @private
     */
    _getRedirectUrl(currentUrl, redirectUri) {
        currentUrl = url.parse(currentUrl);
        redirectUri = url.parse(redirectUri);
        const hostname = redirectUri.hostname || currentUrl.hostname;
        const protocol = redirectUri.protocol || currentUrl.protocol;

        return protocol + '//' + hostname + redirectUri.path;
    }
});

module.exports = PhantomEnvironment;
