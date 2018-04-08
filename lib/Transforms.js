const debug = require('debug')('Transforms');
const Storage = require('./Storage');
const transformsFactory = require('./transforms/transformsFactory');

class Transforms {
    constructor(options) {
        this._storage = options.storage || new Storage();
    }

    /**
     * Perform transformations to result value
     * @param {Array.<TransformOptions>} transforms
     * @param {*} value
     * @returns {*}
     */
    produce(transforms, value) {
        transforms = transforms || [];
        debug('transforms are producing for %o on %o', transforms, value);
        return transforms.reduce((value, options) => {
            value = typeof value === 'undefined' ? '' : value;
            const transform = transformsFactory.createTransform({
                options,
                value,
                storage: this._storage
            });

            if (!transform) {
                throw new Error('Unsupported transform type: ' + options.type);
            }

            return transform.transform();
        }, value);
    }

    /**
     * Add custom transform
     * @param {string} type
     * @param {Function} transform
     */
    addTransform(type, transform) {
        transformsFactory.addTransform(type, transform);
    }
}

module.exports = Transforms;
