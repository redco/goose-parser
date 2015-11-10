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
    vow = require('vow');

/**
 * @typedef {object} PhantomEnvironmentOptions
 */
var defaultOptions = {
    timeout: 60000,
    interval: 0,

    weak: true,
    loadImages: false,
    ignoreSslErrors: true,
    sslProtocol: 'any',
    proxy: null,
    proxyType: null,
    proxyAuth: null,
    cookiesFile: null,
    webSecurity: true,
    phantomPath: null,
    snapshot: false,

    reportsDir: 'parser_reports',
    maxPagesCount: Infinity,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12',
    screen: {
        width: 1080,
        height: 768
    }
};

var port = 13200;

/**
 * @param {PhantomEnvironmentOptions} options
 * @constructor
 */
function PhantomEnvironment(options) {
    debug('Initializing..');
    Environment.call(this, options);

    this._options = _.defaults(_.clone(options) || {}, defaultOptions);
    this._url = options.url;

    if (!this._url) {
        throw new Error('You must pass `url` to PhantomEnvironment');
    }

    this._phantomJS = null;
    this._page = null;
    this._navigationActions = [];
}

PhantomEnvironment.prototype = _.create(Environment.prototype, /**@lends PhantomEnvironment*/{
    prepare: function () {
        debug('Preparing..');
        return Environment.prototype.prepare
            .call(this)
            .then(this._setup, this)
            .then(this._navigateTo.bind(this, this._url))
            .then(this._handlePhantomEvents, this)
            .then(this._setViewport, this)
            .then(this._setUserAgent, this)
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
        debug('.snapshot()');
        var options = this._options;
        if (!options.snapshot) {
            debug('skip snapshot');
            return vow.resolve();
        }

        var screenShotFilePath = path.join(options.reportsDir, this._getHostName(this._url));
        var screenShotFileName = path.join(screenShotFilePath, fileName + '.png');
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
            }, this);
    },

    waitForPage: function () {
        var deferred = vow.defer();
        this._navigationActions.push(function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        }.bind(this));
        return deferred.promise().then(this._inject, this);
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
        if (options.proxy !== null) {
            flags.push('--proxy=' + options.proxy);
        }
        if (options.proxyType !== null) {
            flags.push('--proxy-type=' + options.proxyType);
        }
        if (options.proxyAuth !== null) {
            flags.push('--proxy-auth=' + options.proxyAuth);
        }
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
        this._phantomJS.exit(0);
        debug('._tearDownInstance() tearing down');
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
        this._page.open(url, function (status) {
            debug('.goto() page loaded: ' + status);
            deferred.resolve();
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
        else if (type === 'resourceRequestStarted') {
            var args = [].slice.call(arguments);
            args = args.slice(1, args.length - 1); // callback OR callback with args
            this._page.onResourceRequested.apply(this._page, args);
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
            }),
            this._on('error', function (msg, trace) {
                phantomError('%s, trace %o', msg, trace);
            }),
            this._on('consoleMessage', function (msg) {
                var regex = /^(\[RedParser])(.+)/i;
                var found = msg.match(regex);
                if (found !== null && found[2] !== undefined) {
                    debugParser(found[2].trim());
                } else {
                    debug('Phantom page message: ' + msg);
                }
            }),
            this._on('navigationRequested', function (url) {
                debug('Navigation to %s', url);
            }),
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
