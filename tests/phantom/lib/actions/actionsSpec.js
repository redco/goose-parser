import {expect} from 'chai';
import {createParser, setServerResponse} from '../../tools';

let parser;

describe('Using actions, the parser', () => {
    before(() => {
        parser = createParser();
    });

    it('condition.then', async () => {
        setServerResponse(
            `
                <div>text</div>
            `,
            function run () {
                document.getElementsByTagName('DIV')[0].addEventListener('click', function(e) {
                    e.target.innerHTML = 'clicked';
                });
            }
        );
        let result = await parser.parse({
            actions: [
                {
                    type: 'condition',
                    if: [
                        {
                            type: 'exist',
                            scope: ':contains(text)'
                        }
                    ],
                    then: [
                        {
                            type: 'click',
                            scope: 'div'
                        }
                    ],
                    else: [
                        {
                            type: 'click',
                            scope: '.non-exist-container'
                        }
                    ]
                }
            ],
            rules: {
                scope: 'div'
            }
        });
        expect(result).to.equal('clicked');
    });

    it('condition.else', async () => {
        setServerResponse(
            `
                <div>text</div>
            `,
            function run () {
                document.getElementsByTagName('DIV')[0].addEventListener('click', function(e) {
                    e.target.innerHTML = 'clicked';
                });
            }
        );

        const result = await parser.parse({
            actions: [
                {
                    type: 'condition',
                    if: [
                        {
                            type: 'exist',
                            scope: '.not-exists-element'
                        }
                    ],
                    then: [
                        {
                            type: 'click',
                            scope: 'div'
                        }
                    ],
                    else: [
                        {
                            type: 'click',
                            scope: '.non-exist-container'
                        }
                    ]
                }
            ],
            rules: {
                scope: 'div'
            }
        });
        expect(result).to.equal('text');
    });

    it('cases.1', async () => {
        setServerResponse(
            `
                <a class='query' href="tel:834775566654">query</a>
                <a class='page' href="/page?phone=tel:834775566654">page</a>
            `,
            function run () {
                document.querySelector('.page').innerText = window.location.search.slice(7);
            }
        );
        const result = await parser.parse({
            actions: [
                {
                    type: 'click',
                    scope: '.query',
                    cases: [
                        [
                            {
                                type: 'waitForQuery',
                                uri: 'tel:',
                                set: 'phone'
                            }
                        ],
                        [
                            {
                                type: 'waitForPage',
                            }
                        ]
                    ]
                }
            ],
            rules: {
                get: 'phone'
            }
        });
        expect(result).to.equal('tel:834775566654');
    });

    it('cases.2', async () => {
        setServerResponse(
            `
                <a class='query' href="tel:834775566654">query</a>
                <a class='page' href="/page?phone=834775566654">page</a>
            `,
            function run () {
                document.querySelector('.page').innerText = window.location.search.slice(7);
            }
        );
        const result = await parser.parse({
            actions: [
                {
                    type: 'click',
                    scope: '.page',
                    cases: [
                        [
                            {
                                type: 'waitForQuery',
                                uri: 'tel:',
                                set: 'phone'
                            }
                        ],
                        [
                            {
                                type: 'waitForPage',
                            }
                        ]
                    ]
                }
            ],
            rules: {
                scope: '.page'
            }
        });
        console.log(result);
        expect(result).to.equal('834775566654');
    });

    it('should perform actions before parsing', async () => {
        setServerResponse(
            `
                <div>text</div>
            `,
            function run () {
                document.getElementsByTagName('DIV')[0].addEventListener('click', function(e) {
                    e.target.innerHTML = 'clicked';
                })
            }
        );
        const result = await parser.parse({
            actions: [
                {
                    type: 'click',
                    scope: 'div'
                }
            ],
            rules: {
                scope: 'div'
            }
        });
        expect(result).to.equal('clicked');
    });
});
