var libFolder = process.env.JSCOV ? '../lib-cov/' : '../lib/';
var Parser = require(libFolder + 'Parser');
var Actions = require(libFolder + 'Actions');
var Paginator = require(libFolder + 'Paginator');
var Transforms = require(libFolder + 'Transforms');
var PhantomEnvironment = require(libFolder + 'PhantomEnvironment');
var Environment = require(libFolder + 'Environment');
var chai = require('chai');
var expect = chai.expect;
var path = require('path');

var env;
var uri = 'file://' + path.join(__dirname, '/phantom_parser.html');

before(function () {
    env = new PhantomEnvironment({
        url: uri,
        screen: {
            width: 1080,
            height: 200
        }
    });
});

describe('Parser', function () {
    describe('#parse', function () {
       

        it('parse page with scroll pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'scroll',
                    interval: 500
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.scrollable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(11);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1');
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with page pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'page',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed'
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(10);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with custom pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'custom-pagination',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed'
                }
            });

            var previousPageHtml;
            parser.addPagination('custom-pagination', function (options) {
                var selector = options.scope + ':eq(' + this._currentPage + ')';
                return this._env
                    .evaluateJs(options.pageScope, this._getPaginatePageHtml)
                    .then(function (html) {
                        previousPageHtml = html;
                    })
                    .then(function () {
                        return this._actions.click(selector);
                    }, this);
            }, function (options, timeout) {
                return this._actions.wait(this._getPaginatePageHtml, function (html) {
                    return html !== null && html !== previousPageHtml;
                }, [options.pageScope], timeout)
            });

            return parser.parse(
                {
                    rules: {
                        scope: '.pageable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(10);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with missed params for custom pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'custom-pagination',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed'
                }
            });

            var fn = parser.addPagination.bind(parser, 'custom-pagination');
            expect(fn).to.throw(Error, /paginateFn and checkPaginateFn should be functions which return Promise/);
        });

        it('parse page with page pagination and maxPagesCount', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'page',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed',
                    maxPagesCount: 3
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(3);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with page pagination and maxResultsCount', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'page',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed',
                    maxResultsCount: 3
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(3);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with wrong type of pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'unknownType',
                    scope: '.pageable .pagination div',
                    pageScope: '.pageable .content .scope-pagination-passed',
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function () {
                }, function (err) {
                    expect(err).to.be.instanceOf(Error);
                    expect(err.message).equal('Unknown pagination type: unknownType');
                });
        });

        it('parse page with page href pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'page',
                    scope: '.pageable-simple .pagination div',
                    pageScope: '.pageable-simple .content .scope-pagination-passed'
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable-simple > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(10);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });

        it('parse page with page href pagination with predefined strategy', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'page',
                    scope: '.pageable-simple .pagination div',
                    pageScope: '.pageable-simple .content .scope-pagination-passed',
                    strategy: 'newPage'
                }
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.pageable-simple > .content > div.scope-pagination-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-pagination-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-pagination-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-pagination-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-pagination-passed-column4'}
                                ]
                            }
                        ]]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(10);

                    found.forEach(function (item, i) {
                        expect(item.column1, 'row' + i).equal('column1' + (i + 1));
                        for (var i = 2; i <= 4; i++) {
                            var val = 'column' + i;
                            expect(item['sub-column'][val], 'row' + i).equal(val);
                        }
                    }, this);
                });
        });
    });

    it('addAction', function () {
        var parser = new Parser({
            environment: env
        });
        parser.addAction('custom-wait', function (options) {
            return this.waitElement(options.scope, options.timeout || 2000);
        });
        return parser.parse(
            {
                actions: [{
                    type: 'custom-wait',
                    scope: 'div.scope-simple'
                }],
                rules: {
                    scope: 'div.scope-simple'
                }
            }
        ).then(function (found) {
                expect(found).equal('simple');
            });
    });

    it('addTransform', function () {
        var parser = new Parser({
            environment: env
        });
        parser.addTransform('custom-transform', function (options, result) {
            return result + options.increment;
        });
        return parser.parse(
            {
                rules: {
                    scope: 'div.scope-simple',
                    transform: [
                        {
                            type: 'custom-transform',
                            increment: 1
                        }
                    ]
                }
            }
        ).then(function (found) {
                expect(found).equal('simple1');
            });
    });
});

describe('Actions', function () {
    describe('#performForRule', function () {
        it('perform click and wait actions', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    return actions.performForRule({
                            actions: [
                                {
                                    type: 'wait',
                                    scope: 'div.scope-simple-actions'
                                },
                                {
                                    type: 'click',
                                    scope: 'div.scope-simple-actions'
                                },
                                {
                                    type: 'wait',
                                    scope: 'div.scope-simple-actions.clicked'
                                }
                            ]
                        },
                        'body'
                    );
                });
        });

        it('perform type, click+waitForPage, conditionalActions, exist  actions', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    return actions.performForRule({
                            actions: [
                                {
                                    scope: '.form .value',
                                    type: 'type',
                                    text: 'submitted'
                                },
                                {
                                    scope: '.form input[type=submit]',
                                    type: 'click',
                                    waitForPage: true
                                },
                                {
                                    type: 'conditionalActions',
                                    conditions: [
                                        {
                                            type: 'exist',
                                            scope: '.submitted-value'
                                        }
                                    ],
                                    actions: [
                                        {
                                            type: 'wait',
                                            scope: '.submitted-value.done'
                                        }
                                    ]
                                }
                            ]
                        },
                        'body'
                    );
                });
        });

        it('perform custom action', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });

                    actions.addAction('custom-click', function (options) {
                        return this._env.evaluateJs(options.scope, /* @covignore */ function (selector) {
                            var nodes = Sizzle(selector);
                            for (var i = 0, l = nodes.length; i < l; i++) {
                                nodes[i].click();
                            }

                            return nodes.length;
                        })
                    });
                    return actions.performForRule({
                            actions: [
                                {
                                    type: 'wait',
                                    scope: 'div.scope-simple-custom-actions'
                                },
                                {
                                    type: 'custom-click',
                                    scope: 'div.scope-simple-custom-actions'
                                },
                                {
                                    type: 'wait',
                                    scope: 'div.scope-simple-custom-actions.clicked'
                                }
                            ]
                        },
                        'body'
                    );
                });
        });

        it('perform action once', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });

                    actions.performForRule({
                            actions: [
                                {
                                    type: 'wait',
                                    scope: 'div.scope-simple-actions',
                                    once: true,
                                    __done: true
                                }
                            ]
                        },
                        'body'
                    );
                });
        });

        it('perform performActions with missed params', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    var fn = actions.performActions.bind(actions);
                    expect(fn).to.throw(Error, /actions must be an Array/);
                });
        });

        it('perform addAction with missed params', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    var fn = actions.addAction.bind(actions);
                    expect(fn).to.throw(Error, /addAction accept type as string and action if function which must return a promise/);
                });
        });

        it('perform performActions with missed params', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    actions.performActions([
                        {type: 'unknownAction'}
                    ], 'body').done(
                        function () {
                        }, function (err) {
                            expect(err).to.be.instanceOf(Error);
                            expect(err.message).equal('Unknown action type: unknownAction');
                        }
                    );
                });
        });

        it('perform conditionalActions with false condition', function () {
            return env
                .prepare()
                .then(function () {
                    var actions = new Actions({
                        environment: env
                    });
                    return actions.performForRule({
                            actions: [
                                {
                                    type: 'conditionalActions',
                                    conditions: [
                                        {
                                            type: 'exist',
                                            scope: '.unknown-element'
                                        }
                                    ],
                                    actions: []
                                }
                            ]
                        },
                        'body'
                    ).then(function (res) {
                            expect(res).to.be.undefined;
                        });
                });
        });
    });
});

describe('Transforms', function () {
    var transforms = new Transforms();
    describe('#produce', function () {
        it('perform date transform', function () {
            var transformedValue = transforms.produce([
                    {
                        type: 'date',
                        locale: 'en',
                        from: 'HH:mm D MMM YYYY',
                        to: 'YYYY-MM-DD'
                    }
                ],
                '21:10 30 Aug 2016'
            );
            expect(transformedValue).equal('2016-08-30');
        });

        it('perform replace transform', function () {
            var transformedValue = transforms.produce([
                    {
                        type: 'replace',
                        re: ['\\s', 'g'],
                        to: ''
                    }
                ],
                ' t e  s  t'
            );
            expect(transformedValue).equal('test');
        });

        it('perform custom transform', function () {
            transforms.addTransform('custom-transform', function (options, result) {
                return result + options.increment;
            });
            var transformedValue = transforms.produce([
                    {
                        type: 'custom-transform',
                        increment: 3
                    }
                ],
                'value'
            );
            expect(transformedValue).equal('value3');
        });

        it('perform unsupported transformation type', function () {
            var fn = transforms.produce.bind(transforms, [{
                    type: 'unknownType'
                }],
                ' t e  s  t'
            );
            expect(fn).to.throw(Error, /Unsupported transformation type: unknownType/);
        });
    });

    it('perform addTransform with wrong data', function () {
        var fn = transforms.addTransform;
        expect(fn).to.throw(Error, /addTransformation accept type as string and transformation as function which must return a transformed value/);
    });
});

describe('Environment', function () {
    var environment = new Environment();

    it('perform evaluateJs', function () {
        var fn = environment.evaluateJs.bind(environment, function () {
        });
        expect(fn).to.throw(Error, /You must redefine evaluateJs method in child environment/);
    });

    it('perform waitForPage', function () {
        var fn = environment.waitForPage.bind(environment);
        expect(fn).to.throw(Error, /You must redefine waitForPage method in child environment/);
    });

    it('perform prepare, snapshot, tearDown', function () {
        environment
            .prepare()
            .then(environment.snapshot)
            .then(environment.tearDown)
            .then(function () {
                expect(true).equal(true);
            }, function () {
                expect(true).equal(false);
            })
    });
});
