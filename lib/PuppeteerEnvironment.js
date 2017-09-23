'use strict';

const _ = require('lodash'),
    Environment = require('./Environment'),
    debugLib = require('debug'),
    debug = debugLib('PuppeteerEnvironment'),
    puppeteerError = debugLib('Puppeteer:error'),
    debugParser = debugLib('RedParser'),
    puppeteer = require('puppeteer'),
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
 * @typedef {object} PuppeteerEnvironmentOptions
 * @property {?number} timeout
 * @property {?boolean} weak
 * @property {?boolean} loadImages
 * @property {?boolean} ignoreSslErrors
 * @property {?string} sslProtocol
 * @property {?string} cookiesFile
 * @property {?boolean} webSecurity
 * @property {?string} puppeteerPath
 *
 * @property {?string} snapshot perform snapshot during parsing
 * @property {?string} snapshotDir directory for snapshots
 * @property {?Proxy|Array.<Proxy>} proxy single proxy or proxy list
 * @property {Array.<ProxyIndicator>} proxyIndicators Indicators which say that proxy became unreachable
 * @property {?function} proxyRotator proxy rotator function(proxyList, currentProxy) with context of this env. function should return Proxy from the list
 * @property {?string|Array.<string>} userAgent user agent or list of agents for setting to puppeteer
 * @property {?Screen} screen screen dimensions
 * @property {?Resources} resources white and black lists for loading resources on the page
 */
const defaultOptions = {
    // Puppeteer options
    timeout: 60 * 1000,
    weak: true,
    loadImages: false,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    cookiesFile: null,
    webSecurity: false,
    puppeteerPath: null,

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
 * @param {PuppeteerEnvironmentOptions} options
 * @constructor
 */
function PuppeteerEnvironment(options) {
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
        throw new Error('You must pass `url` to PuppeteerEnvironment');
    }

    this._browser = null;
    this._page = null;
    this._navigationActions = [];
    this._requestingActions = [];
    this._exitHanlers = [];
    this._browserEnvInjected = false;
}

PuppeteerEnvironment.prototype = _.create(Environment.prototype, /**@lends PuppeteerEnvironment*/{
    prepare() {
        debug('Preparing...');
        return Environment.prototype.prepare
            .call(this)
            .then(() => this._setup())
            // .then(() => this._setViewport())
            // .then(() => this._setUserAgent())
            // .then(() => this._setTimeout())
            .then(() => this._handlePuppeteerEvents())
            .then(() => this._rotateProxy())
            .then(() => this._navigateTo(this._url))
            .then(() => this._validateProxy())
            .then(() => this._inject());
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
        const page = this._page;
        const args = Array.prototype.slice.call(arguments, 0);
        const evalFunc = args.pop();
        if (typeof evalFunc !== 'function') {
            throw new Error('You must pass function as last argument to PuppeteerEnvironment.evaluateJs');
        }
        args.unshift(evalFunc);

        return page.evaluate.apply(page, args);
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
     * Set up a fresh puppeteerjs page.
     * @returns {Promise}
     * @private
     */
    _setup() {
        return this
            ._createInstance()
            .then(() => this._createPage());
    },

    /**
     * Create a puppeteerjs instance.
     * @returns {Promise}
     * @private
     */
    _createInstance() {
        return puppeteer
            .launch()
            .then(browser => this._browser = browser);
    },

    _getPort() {
        port++;
        return port;
    },

    /**
     * Creates new page in puppeteer
     * @returns {Promise}
     */
    _createPage() {
        debug('._createPage() has called');
        return this._browser
            .newPage()
            .then(page => this._page = page)
            .then(page => page.setRequestInterceptionEnabled(true));
    },

    /**
     * Tear down a puppeteerjs instance.
     */
    tearDown() {
        debug('._tearDownInstance() tearing down');
        var puppeteer = this._puppeteerJS;
        if (!puppeteer || !puppeteer.process) {
            debug('Puppeteer process already exited, not killing');
            return vow.resolve();
        }

        var deferred = vow.defer();
        var pid = puppeteer.process.pid;

        debug('Terminating puppeteer process gracefully, pid: ', pid);
        if (this._page) {
            this._page.close();
            delete this._page;
        }

        puppeteer.exit();

        const timeout = setTimeout(() => {
            const i = this._exitHanlers.indexOf(resolver);
            if (i !== -1) {
                this._exitHanlers.splice(i, 1);
            }

            debug('puppeteer time is out, kill it and go ahead');
            if (puppeteer.process) {
                puppeteer.process.kill('SIGKILL');
            }

            deferred.resolve();
        }, 5000); // 5 sec to die

        function resolver() {
            clearTimeout(timeout);
            deferred.resolve();
        }

        this._exitHanlers.push(resolver);

        delete this._puppeteerJS;
        return deferred.promise();
    },

    /**
     * Handles the puppeteer process ending/crashing unexpectedly.
     * If an `onExit` handler has been bound then that will be called. Otherwise, the error will be re-thrown.
     * @param {Number} code
     * @param {String} [signal]
     */
    _handleExit(code, signal) {
        debug('Puppeteer exited with code ' + code + ' and signal ' + signal);
        //delete this._puppeteerJS.process;

        // otherwise, if we have a non-zero code we'll throw a better error message
        // than the `puppeteer` lib would.
        if (code !== 0) {
            var err = new Error('The PuppeteerJS process ended unexpectedly');
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
        debug('.goto() url: ' + url);
        return this._page.goto(url);
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
     * Apply proxy to Puppeteer
     * @private
     */
    _applyProxy(proxy) {
        const deferred = vow.defer();
        this._puppeteerJS.setProxy(proxy.host, proxy.port, 'manual', proxy.username, proxy.password, () => {
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

    _injectFiles(files) {
        return Promise.all(files.map(file => {
            debug('injecting file %s', file);
            return this._page.injectFile(path.join(__dirname, '..', file));
        }));
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

    _handlePuppeteerEvents() {
        const page = this._page;

        page.on('error', (e) => {
            puppeteerError('%o, fire %s errbacks', e, this._errbacks.length);
            // this._errbacks.splice(0).forEach(errback => errback(msg, trace));
        });

        page.on('pageerror', (msg) => {
            puppeteerError('%s, fire %s errbacks', msg, this._errbacks.length);
            // this._errbacks.splice(0).forEach(errback => errback(msg, trace));
        });

        // todo: make it workable
        page.on('console', msg => {
            const regex = /^(\[GooseParser])(.+)/i;
            const found = msg.match(regex);

            if (found) {
                debugParser(found[2].trim());
            } else {
                debug('Puppeteer page message: ' + msg);
            }
        });

        page.on('load', () => {
            debug('Page loaded successfully, fire %s callbacks', this._navigationActions.length);
            this._navigationActions.splice(0).forEach(callback => callback());
        });

        const {
            allowed: allowedUrls,
            denied: blockedUrls,
        } = this._options.resources;
        const hasAllowedUrls = Array.isArray(allowedUrls) && allowedUrls.length > 0;
        const hasBlockedUrls = Array.isArray(blockedUrls) && blockedUrls.length > 0;

        page.on('request', (request) => {
            const {url} = request;
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

            const allowed = !hasAllowedUrls || allowedUrls.some(urlPattern => url.match(urlPattern));
            let blocked = false;
            if (!hasAllowedUrls && hasBlockedUrls) {
                blocked = blockedUrls.some(urlPattern => url.match(urlPattern) !== null);
            }

            if (!allowed || blocked) {
                console.log('[GooseParser] Resource ' + url.substr(0, 30) + ' was aborted');
                request.abort();
            } else {
                request.continue();
            }
        });

        page.on('response', (pesponse) => {
            // debug('Resource recieved %o', resource);
            // redirect has occurred
            if ([302, 301].includes(pesponse.status)) {
                const redirectUrl = this._extractRedirectUrl(pesponse) || '';

                // if current url matches with this._url or with the last redirect url from this._redirectUrls
                if (
                    redirectUrl &&
                    (
                        pesponse.url === this._url ||
                        pesponse.url === this._redirectUrls[this._redirectUrls.length - 1]
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

        page.on('requestfailed', request => {
            debug('Navigation error %s', request.url);
            const response = request.response();
            debug('Response %o', response);
            if (response) {
                const matched = this.getProxyIndicators('responseCode').find((item) => {
                    return item.code === response.status;
                });
                if (matched) {
                    this.addProxyError(this.createProxyError(matched));
                }
            }

            if (request.url === this._url) {
                this._navigationActions.splice(0).forEach(callback => callback(new Error('Page is not loaded')));
            }
        });
    },

    /**
     * @param {object} response
     * @returns {string}
     * @private
     */
    _extractRedirectUrl(response) {
        let redirectUrl = reponse.headers.location;
        return redirectUrl ? this._getRedirectUrl(response.url, redirectUrl) : '';
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

module.exports = PuppeteerEnvironment;
