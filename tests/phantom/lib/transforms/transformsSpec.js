import {expect, should} from 'chai';
import {createParser, setServerResponse} from '../../tools';

let parser;

describe('Using transforms', () => {
    before(() => {
        parser = createParser();
    });

    it('.combine', async () => {
        setServerResponse(
            `
                <div class="first">1</div>
                <div class="second">2</div>
            `
        );
        const result = await parser.parse({
            rules: {
                collection: [
                    {
                        scope: '.first',
                        set: 'first',
                        virtual: true
                    },
                    {
                        scope: '.second',
                        set: 'second',
                        virtual: true
                    },
                    {
                        name: 'result',
                        value: '',
                        type: 'array',
                        transform: [
                            {
                                type: 'combine',
                                dataType: 'int',
                                fields: [
                                    "first", "second"
                                ]
                            }
                        ]
                    },
                ]
            }
        });
        expect(result).to.deep.equal({result: [1, 2]});
    });

    it('.compare', async () => {
        setServerResponse(
            `
                <div>text</div>
            `
        );
        const result = await parser.parse({
            rules: {
                collection: [
                    {
                        scope: 'div',
                        set: 'value',
                        virtual: true
                    },
                    {
                        name: 'result',
                        value: 'text',
                        transform: [
                            {
                                type: 'compare',
                                field: 'value'
                            }
                        ]
                    },
                ]
            }
        });
        expect(result).to.deep.equal({result: true});
    });

    it('.decodeHTML', async () => {
        setServerResponse(
            `
                <div>&lt;&gt;</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'decodeHTML'
                    }
                ]
            }
        });
        expect(result).to.equal('<>');
    });

    it('.encodeURI', async () => {
        setServerResponse(
            `
                <a href="http://test.com/?s=on the top"></a>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'a',
                attr: 'href',
                transform: [
                    {
                        type: 'encodeURI'
                    }
                ]
            }
        });
        expect(result).to.equal('http://test.com/?s=on%20the%20top');
    });

    it('.decodeURI', async () => {
        setServerResponse(
            `
                <a href="http://test.com/?s=on%20the%20top"></a>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'a',
                attr: 'href',
                transform: [
                    {
                        type: 'decodeURI'
                    }
                ]
            }
        });
        expect(result).to.equal('http://test.com/?s=on the top');
    });

    it('.get', async () => {
        setServerResponse(
            `
                <div>text1,text2,text3</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'split',
                        separator: ',',
                        dataType: 'array'
                    },
                    {
                        type: 'get',
                        path: '[2]'
                    }
                ]
            }
        });
        expect(result).to.equal('text3');
    });

    it('.join', async () => {
        setServerResponse(
            `
                <div>text1,text2,text3</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'split',
                        separator: ',',
                        dataType: 'array'
                    },
                    {
                        type: 'join',
                        glue: ';'
                    }
                ]
            }
        });
        expect(result).to.equal('text1;text2;text3');
    });

    it('.match', async () => {
        setServerResponse(
            `
                <div>text1,text2,text3</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'match',
                        re: [',([A-z0-9]+),'],
                        index: 1
                    }
                ]
            }
        });
        expect(result).to.equal('text2');
    });

    it('.replace', async () => {
        setServerResponse(
            `
                <div> t e x t </div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'replace',
                        re: ['\\s', 'g'],
                        to: ''
                    }
                ]
            }
        });
        expect(result).to.equal('text');
    });

    it('.pick', async () => {
        setServerResponse(
            `
                <div class="first">1</div>
                <div class="second">2</div>
            `
        );
        const result = await parser.parse({
            rules: {
                collection: [
                    {
                        collection: [
                            {
                                scope: '.first',
                                name: 'first'
                            },
                            {
                                scope: '.second',
                                name: 'second'
                            }
                        ],
                        set: 'obj',
                        virtual: true
                    },
                    {
                        name: 'result',
                        get: 'obj',
                        transform: [
                            {
                                type: 'pick',
                                prop: 'second'
                            }
                        ]
                    }
                ]
            }
        });
        expect(result).to.deep.equal({result: {second: '2'}});
    });

    it('.trim', async () => {
        setServerResponse(
            `
                <div> text </div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'trim'
                    }
                ]
            }
        });
        expect(result).to.equal('text');
    });

    it('.split', async () => {
        setServerResponse(
            `
                <div>text1,text2,text3</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'split',
                        separator: ',',
                        dataType: 'array'
                    }
                ]
            }
        });
        expect(result).to.deep.equal(['text1', 'text2', 'text3']);
    });

    it('.date', async () => {
        setServerResponse(
            `
                <div>23:20 20 Dec 2017</div>
            `
        );
        const result = await parser.parse({
            rules: {
                scope: 'div',
                transform: [
                    {
                        type: 'date',
                        locale: 'en',
                        from: 'HH:mm D MMM YYYY',
                        to: 'YYYY-MM-DD'
                    }
                ]
            }
        });
        expect(result).to.equal('2017-12-20');
    });
});
