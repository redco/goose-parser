/**
 * Wait until function evalFunction expected in checkerFunction result
 * @param {AbstractEnvironment} env
 * @param {Function} evalFunction
 * @param {Function} [checkerFunction]
 * @param {Array} [args]
 * @param {number} [timeout]
 * @param {number} [interval]
 * @returns {Promise}
 */
module.exports = async function wait(env, evalFunction, checkerFunction, args, timeout, interval) {
    args = args || [];
    checkerFunction = checkerFunction || function(result) {
        return !!result
    };

    timeout = timeout || 5000;
    interval = interval || 10;

    return new Promise((resolve, reject) => {
        const errBack = (msg) => {
            clearTimeout(timeoutId);
            clearInterval(intervalId);
            reject(new Error('Error during wait with args ' + args.toString() + ': ' + msg));
        };

        const timeoutId = setTimeout(() => {
            env.removeErrBack(errBack);
            clearInterval(intervalId);
            reject(new Error('Timeout for wait with arguments: ' + args.toString()));
        }, timeout);

        env.addErrBack(errBack);

        const evalArgs = args.slice(0);
        evalArgs.push(evalFunction);
        let intervalId = setInterval(() => {
            env.evaluateJs(...evalArgs)
                .then((result) => {
                    if (checkerFunction(result)) {
                        clearTimeout(timeoutId);
                        clearInterval(intervalId);
                        env.removeErrBack(errBack);
                        resolve();
                    }
                });
        }, interval);
    });
};
