import {expect} from 'chai';
import {createParser, setServerResponse} from '../../tools';

let parser;

describe('Using collection rule, the parser', () => {
    before(() => {
        parser = createParser();
    });

    it('should parse a collection node', async () => {
        setServerResponse(`
            <div class="item1">wrong</div>
            <div class="item2">wrong</div>
            <ul>
                <li class="item1">item1</li>
                <li class="item2">item2</li>
            </ul>
        `);
        const result = await parser.parse({
            rules: {
                scope: 'ul',
                collection: [
                    {
                        name: 'prop1',
                        scope: '.item1'
                    },
                    {
                        name: 'prop2',
                        scope: '.item2'
                    }
                ]
            }
        });
        expect(result).to.deep.equal({
            prop1: 'item1',
            prop2: 'item2'
        });
    });

    it('should parse a grid node', async () => {
        setServerResponse(`
            <ul>
                <li>
                    <dl>
                        <dd>label1</dd>
                        <dt>value1</dt>
                    </dl>
                </li>
                <li>
                    <dl>
                        <dd>label2</dd>
                        <dt>value2</dt>
                    </dl>
                </li>
            </ul>
        `);
        const result = await parser.parse({
            rules: {
                scope: 'li',
                collection: [[
                    {
                        name: 'label',
                        scope: 'dd'
                    },
                    {
                        name: 'value',
                        scope: 'dt'
                    }
                ]]
            }
        });
        expect(result).to.deep.equal([
            {
                label: 'label1',
                value: 'value1'
            },
            {
                label: 'label2',
                value: 'value2'
            }
        ]);
    });

    it.only('should parse a collection inside a grid node', async () => {
        setServerResponse(`
            <ul>
                <li>
                    <dl>
                        <dd>label1</dd>
                        <dt>value1</dt>
                    </dl>
                    <address>address1</address>
                </li>
                <li>
                    <dl>
                        <dd>label2</dd>
                        <dt>value2</dt>
                    </dl>
                    <address>address2</address>
                </li>
            </ul>
        `);
        const result = await parser.parse({
            rules: {
                scope: 'li',
                collection: [[
                    {
                        name: 'label',
                        scope: 'dd'
                    },
                    {
                        name: 'value',
                        scope: 'dt'
                    },
                    {
                        name: 'collection',
                        collection: [
                            {
                                name: 'address',
                                scope: 'address'
                            }
                        ]
                    }
                ]]
            }
        });
        expect(result).to.deep.equal([
            {
                label: 'label1',
                value: 'value1',
                collection: {
                    address: 'address1'
                }
            },
            {
                label: 'label2',
                value: 'value2',
                collection: {
                    address: 'address2'
                }
            }
        ]);
    });
});
