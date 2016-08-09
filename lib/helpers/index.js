const fs = require('fs');
const path = require('path');
const actionsNames = fs
    .readdirSync(path.join(__dirname, 'actions'))
    .map(fileName => fileName.replace(/\.js$/, ''));
const transformsNames = fs
    .readdirSync(path.join(__dirname, 'transforms'))
    .map(fileName => fileName.replace(/\.js$/, ''));
const rulesNames = fs
    .readdirSync(path.join(__dirname, 'rules'))
    .map(fileName => fileName.replace(/\.js$/, ''));

const helpers = {
    serialize(langoose) {
        return JSON.parse(JSON.stringify(langoose));
    },

    actions: actionsNames.reduce((helpers, name) => {
        const helper = require(`./actions/${name}`);

        helpers[name] = function() {
            const res = helper.apply(null, arguments);
            if (typeof res.type === 'undefined') {
                res.type = name;
            }

            Object.defineProperties(res, {
                $inside: {
                    enumerable: false,
                    value(parentScope) {
                        this.parentScope = parentScope;
                        return this;
                    }
                },

                $set: {
                    enumerable: false,
                    value(value) {
                        this.set = value;
                        return this;
                    }
                },

                $trueCase: {
                    enumerable: false,
                    value() {
                        this.trueCase = true;
                        return this;
                    }
                },

                $waitForPage: {
                    enumerable: false,
                    value(timeout) {
                        this.waitForPage = true;
                        this.waitForPageTimeout = timeout;
                        return this;
                    }
                },

                $waitForQuery: {
                    enumerable: false,
                    value(waitForQuery) {
                        this.waitForQuery = waitForQuery;
                        return this;
                    }
                },

                $cases: {
                    enumerable: false,
                    value(cases) {
                        this.cases = cases;
                        return this;
                    }
                },


                $transform: {
                    enumerable: false,
                    value(transform) {
                        this.transform = Array.isArray(transform) ? transform : [transform];
                        return this;
                    }
                }
            });

            return res;
        };

        return helpers;
    }, {}),

    transforms: transformsNames.reduce((helpers, name) => {
        const helper = require(`./transforms/${name}`);

        helpers[name] = function() {
            const res = helper.apply(null, arguments);
            if (typeof res.type === 'undefined') {
                res.type = name;
            }

            return res;
        };

        return helpers;
    }, {}),

    rules: rulesNames.reduce((helpers, name) => {
        const helper = require(`./rules/${name}`);

        helpers[name] = function() {
            const res = helper.apply(null, arguments);

            Object.defineProperties(res, {
                $scope: {
                    enumerable: false,
                    value(scope) {
                        this.scope = scope;
                        return this;
                    }
                },

                $as: {
                    enumerable: false,
                    value(name) {
                        this.name = name;
                        return this;
                    }
                },

                $id: {
                    enumerable: false,
                    value() {
                        this.id = true;
                        return this;
                    }
                },

                $transform: {
                    enumerable: false,
                    value(transform) {
                        this.transform = Array.isArray(transform) ? transform : [transform];
                        return this;
                    }
                },

                $actions: {
                    enumerable: false,
                    value(actions) {
                        this.actions = Array.isArray(actions) ? actions : [actions];
                        return this;
                    }
                },

                $catch: {
                    enumerable: false,
                    value(handlers) {
                        this.catchError = handlers;
                        return this;
                    }
                },

                $set: {
                    enumerable: false,
                    value(value) {
                        this.set = value;
                        return this;
                    }
                },

                $virtual: {
                    enumerable: false,
                    value() {
                        this.virtual = true;
                        return this;
                    }
                }
            });

            return res;
        };

        return helpers;
    }, {}),

    milestone(options) {
        options.type = 'milestone';
        options.condition = Array.isArray(options.condition) ? options.condition : [options.condition];
        return options;
    }
};

module.exports = helpers;
