var Parser = require('../lib/Parser');
var Actions = require('../lib/Actions');
var Transformations = require('../lib/Transformations');
var PhantomEnvironment = require('../lib/PhantomEnvironment');
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
        it('parse simple node', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    rules: {
                        scope: 'div.scope-simple'
                    }
                }
            ).then(function (found) {
                    expect(found).equal('simple');
                });
        });

        it('parse simple node with separator', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    rules: {
                        scope: 'div.scope-simple-multiple',
                        separator: ','
                    }
                }
            ).then(function (found) {
                    expect(found).equal('simple,simple');
                });
        });

        it('parse simple node and get result as array', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    rules: {
                        scope: 'div.scope-simple-multiple',
                        type: 'array'
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Array);
                    expect(found.length).equal(2);

                    found.forEach(function (row, i) {
                        expect(row, 'row' + i).equal('simple');
                    });
                });
        });

        it('parse collection node', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    rules: {
                        scope: 'div.scope-collection',
                        collection: [
                            {
                                name: 'column1',
                                scope: 'div.scope-collection-column1'
                            },
                            {
                                name: 'column2',
                                scope: 'div.scope-collection-column2'
                            }
                        ]
                    }
                }
            ).then(function (found) {
                    expect(found).to.be.instanceOf(Object);
                    expect(found.column1).equal('column1');
                    expect(found.column2).equal('column2');
                });
        });

        it('parse simple node with pre-actions', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    actions: [
                        {
                            type: 'wait',
                            scope: 'div.scope-simple-pre-actions'
                        },
                        {
                            type: 'click',
                            scope: 'div.scope-simple-pre-actions'
                        },
                        {
                            type: 'wait',
                            scope: 'div.scope-simple-pre-actions.clicked'
                        }
                    ],
                    rules: {
                        name: 'node',
                        scope: 'div.scope-simple-pre-actions.clicked'
                    }
                }
            ).then(function (found) {
                    expect(found).equal('simple1');
                });
        });

        it('parse single page', function () {
            var parser = new Parser({
                environment: env
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
                    expect(found.length).equal(1);

                    var item = found[0];
                    expect(item.column1).equal('column1');
                    for (var i = 2; i <= 4; i++) {
                        var val = 'column' + i;
                        expect(item['sub-column'][val]).equal(val);
                    }
                });
        });

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

        it('parse page with page href pagination', function () {
            var parser = new Parser({
                environment: env,
                pagination: {
                    type: 'pageHref',
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

                    actions.addAction('custom-click', function(options) {
                        return this._env.evaluateJs(options.scope, function (selector) {
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
    });
});

describe('Transformations', function () {
    var transformations = new Transformations();
    describe('#produce', function () {
        it('perform date transform', function () {
            var transformedValue = transformations.produce([
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
            var transformedValue = transformations.produce([
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
            transformations.addTransformation('custom-transform', function (options, result) {
                return result + options.increment;
            });
            var transformedValue = transformations.produce([
                    {
                        type: 'custom-transform',
                        increment: 3
                    }
                ],
                'value'
            );
            expect(transformedValue).equal('value3');
        });
    });
});