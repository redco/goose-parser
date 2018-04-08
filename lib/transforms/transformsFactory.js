const Transform = require('./Transform');

const transformsMap = {
    date: require('./TransformDate'),
    replace: require('./TransformReplace'),
    match: require('./TransformMatch'),
    split: require('./TransformSplit'),
    join: require('./TransformJoin'),
    trim: require('./TransformTrim'),
    pluck: require('./TransformPluck'),
    combine: require('./TransformCombine'),
    pick: require('./TransformPick'),
    get: require('./TransformGet'),
    encodeURI: require('./TransformEncodeUri'),
    decodeURI: require('./TransformDecodeUri'),
    decodeHTML: require('./TransformDecodeHtml'),
    decodeBase64: require('./TransformBase64Decode'),
    compare: require('./TransformCompare'),
    equal: require('./TransformEqual'),
};

const transformsFactory = {
    createTransform(options) {
        const TransformConstructor = transformsMap[options.options.type];
        if (!TransformConstructor) {
            return null;
        }

        return new TransformConstructor(options);
    },

    /**
     * Adds custom transform
     * @param {string} type
     * @param {Function} transform
     */
    addTransform(type, transform) {
        if (typeof type !== 'string' || typeof transform !== 'function') {
            throw new Error('addTransform accept "type" as string and "transform" as function which does transformation');
        }

        class CustomTransform extends Transform {
            transform() {
                transform.call(this, this._options);
            }
        }

        transformsMap[type] = CustomTransform;
    }
};

module.exports = transformsFactory;
