const Environment = require('./Environment'),
    debug = require('debug')('JsDOMEnvironment'),
    _ = require('lodash'),
    jsdom = require('jsdom'),
    path = require('path'),
    vow = require('vow'),
    vm = require('vm');

const defaultOptions = {
    // Custom environment options
    snapshot: false,
    snapshotDir: 'snapshots',
    proxy: null,
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_4) AppleWebKit/600.7.12 (KHTML, like Gecko) Version/8.0.7 Safari/600.7.12',
};

/**
 * @param {object} options
 * @constructor
 */
function JsDOMEnvironment(options) {
    debug('Initializing...');
    this._options = _.defaults(_.clone(options) || {}, defaultOptions);
    this._proxy = this._options.proxy;
    this._url = options.url;

    if (!this._url) {
        throw new Error('You must pass `url` to JsDOMEnvironment');
    }
    this._window = null;
}

JsDOMEnvironment.prototype = _.create(Environment.prototype, /**@lends JsDOMEnvironment*/{

    /**
     * Prepare environment
     * @returns {Promise}
     */
    prepare() {
        debug('Preparing...');
        const deferred = vow.defer();

        const params = {
            url: this._url,
            scripts: ['file:' + path.resolve(__dirname, '../vendor/sizzle.min.js')],
            done: (error, window) => {
                debug('Page is initialized in JsDom');
                if (error) {
                    return deferred.reject(error);
                }
                this._window = window;
                deferred.resolve();
            }
        };
        params.userAgent = this.getUserAgent();
        const proxy = this.getProxy();
        if (proxy) {
            params.proxy = proxy;
        }

        jsdom.env(params);
        return deferred.promise();
    },

    /**
     * Tear down environment
     * @returns {Promise}
     */
    tearDown() {
        debug('Tear down...');
        if (this._window) {
            this._window.close();
        }
        return Promise.resolve();
    },

    /**
     * EvaluateJs in the environment
     * @returns {Promise}
     */
    evaluateJs(...args) {
        debug('.evaluateJs() has called');

        let evalFunc = args.pop();
        if (typeof evalFunc !== 'function') {
            throw new Error('You must pass function as last argument to JsDOMEnvironment.evaluateJs');
        }

        const sandbox = {
            window: this._window,
            document: this._window.document,
            Sizzle: this._window.Sizzle,
            args,
            result: null
        };
        vm.createContext(sandbox);
        evalFunc = String(evalFunc);
        vm.runInContext(`const fn = ${evalFunc}; result = fn(...args);`, sandbox);

        return Promise.resolve(sandbox.result);
    },

    /**
     * @return {string|null}
     * @private
     */
    getProxy() {
        if (!this._proxy) {
            return null;
        }

        let proxy = '';
        if (this._proxy.username) {
            proxy += this._proxy.username;
        }
        if (this._proxy.password) {
            proxy += `:${this._proxy.password}`;
        }
        if (proxy) {
            proxy += '@';
        }
        proxy += `${this._proxy.host}:${this._proxy.port}`;

        return proxy;
    },

    /**
     * @returns {string}
     * @private
     */
    getUserAgent() {
        let userAgent = this._options.userAgent;
        if (Array.isArray(userAgent)) {
            userAgent = _.sample(this._options.userAgent);
        }
        return userAgent;
    },
});

module.exports = JsDOMEnvironment;
