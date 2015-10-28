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
        it('parse single page', function () {
            var parser = new Parser({
                environment: env
            });
            return parser.parse(
                {
                    rules: {
                        scope: '.scrollable > .content > div.scope-test-6-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-test-6-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                collection: [
                                    {name: 'column2', scope: 'div.scope-test-6-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-test-6-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-test-6-passed-column4'}
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
                        scope: '.scrollable > .content > div.scope-test-6-passed',
                        collection: [[
                            {name: 'column1', scope: 'div.scope-test-6-passed-column1'},
                            {
                                name: 'sub-column',
                                scope: 'div:last-child',
                                extract: true,
                                collection: [
                                    {name: 'column2', scope: 'div.scope-test-6-passed-column2'},
                                    {name: 'column3', scope: 'div.scope-test-6-passed-column3'},
                                    {name: 'column4', scope: 'div.scope-test-6-passed-column4'}
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
    });
});

describe('Actions', function () {
    describe('#performForRule', function () {
        it('perform actions from parsing rules', function () {
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
                                    scope: 'div.scope-test'
                                },
                                {
                                    type: 'click',
                                    scope: 'div.scope-test'
                                },
                                {
                                    type: 'wait',
                                    scope: 'div.scope-test.clicked'
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
    });
});