/**
 * Wait until function evalFunction expected in checkerFunction result
 * @param {AbstractEnvironment} env
 * @param {Function} evalFunction
 * @param {Function} [checkerFunction]
 * @param {Function} [breakerFunction]
 * @param {Array} [args]
 * @param {number} [timeout]
 * @param {number} [interval]
 * @returns {Promise}
 */
async function waitForEvaluate(env, evalFunction, checkerFunction, breakerFunction, args, timeout, interval) {
    args = args || [];
    checkerFunction = checkerFunction || function(result) {
        return !!result
    };

    timeout = timeout || 5000;
    interval = interval || 10;

    return new Promise((resolve, reject) => {
        const errorCallback = {
            fn: ({ error }) => {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                reject(new Error(`Error during wait with args ${args.toString()}, ${error}`));
            },
        };

        const timeoutId = setTimeout(() => {
            env.removeCallback('error', errorCallback);
            clearInterval(intervalId);
            reject(new Error(`Timeout for wait with args ${args.toString()}`));
        }, timeout);

        env.addCallback('error', errorCallback);

        const evalArgs = args.slice(0);
        evalArgs.push(evalFunction);
        let intervalId = setInterval(() => {
            env.evaluateJs(...evalArgs)
                .then((result) => {
                    if (checkerFunction(result)) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        env.removeCallback('error', errorCallback);
                        resolve();
                        return;
                    }
                    if (breakerFunction()) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        env.removeCallback('error', errorCallback);
                        reject(new Error('Function was terminated by breaker'));
                    }
                });
        }, interval);
    });
}

/**
 * Wait until event happens
 * @param {ChromeEnvironment} env
 * @param {Object} event
 * @param {Function} [breakerFunction]
 * @param {number} [timeout]
 * @param {number} [interval]
 * @returns {Promise}
 */
async function waitForEvent(env, event, breakerFunction, timeout = 5000, interval = 10) {
    const { type, urlPattern } = event;
    await new Promise((resolve, reject) => {
        const callback = {
            fn: ({ error }) => {
                clearTimeout(timeoutId);
                if (error) {
                    reject(error);
                } else {
                    resolve();
                }
            },
            urlPattern,
        };

        const timeoutId = setTimeout(() => {
            env.removeCallback(type, callback);
            reject(new Error('Page navigation timeout'));
        }, timeout);

        const intervalId = setInterval(() => {
            if (breakerFunction()) {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
                env.removeCallback(type, callback);
                reject(new Error('Function was terminated by breaker'))
            }
        }, interval);

        env.addCallback(type, callback);
    });

    if (type === 'navigation') {
        await env._injectFiles(env._getVendors());
    }
}

module.exports = {
  waitForEvent,
  waitForEvaluate,
};
