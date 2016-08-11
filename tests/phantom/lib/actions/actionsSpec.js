import {expect} from 'chai';
import {createParser, setServerResponse} from '../../tools';

let parser;

describe('Using actions, the parser', () => {
    before(() => {
        parser = createParser();
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
