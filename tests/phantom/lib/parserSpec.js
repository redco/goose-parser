import {expect} from 'chai';
import {createParser, setServerResponse} from '../tools';

let parser;

describe('Parser', () => {
    before(() => {
        parser = createParser();
    });

    it('should be able to parse', async () => {
        setServerResponse('<div>text</div>');
        const result = await parser.parse({
            rules: {
                scope: 'div'
            }
        });
        expect(result).to.equal('text');
    });

    it('should return an empty string for empty rules', async () => {
        setServerResponse('');
        const result = await parser.parse({
            rules: {}
        });
        expect(result).to.equal('');
    });
});
