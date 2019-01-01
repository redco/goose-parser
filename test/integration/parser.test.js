/* eslint-env jest */

const ChromeEnvironment = require('goose-chrome-environment');
const { createTestServer, setServerResponse, url } = require('../tools');
const Parser = require('../../lib/Parser');

jest.setTimeout(30000);
describe('Parser', () => {
  let testServer;

  beforeAll(async () => {
    testServer = await createTestServer();
  });

  afterAll(async () => {
    await testServer.close();
  });

  describe('Simple', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="test" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('Collection', () => {
    test('perform', async () => {
      setServerResponse({
        html: `
            <div class="profile">
                <div class="name">UserName</div>
                <div class="surname">UserSurname</div>
                <div class="phone">+12345678901</div>
            </div>
        `,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          scope: '.profile',
          collection: [
            {
              name: 'name',
              scope: '.name',
            },
            {
              name: 'surname',
              scope: '.surname',
            },
            {
              name: 'phone',
              scope: '.phone',
            },
          ],
        },
      });

      expect(result).toEqual({ name: 'UserName', surname: 'UserSurname', phone: '+12345678901' });
    });
  });

  describe('Grid', () => {
    test('perform', async () => {
      setServerResponse({
        html: `
            <table>
                <tr class="profile">
                  <td class="name">UserName1</td>
                  <td class="surname">UserSurname1</td>
                  <td class="phone">+12345678901</td>
                </tr>
                <tr class="profile">
                  <td class="name">UserName2</td>
                  <td class="surname">UserSurname2</td>
                  <td class="phone">+12345678902</td>
                </tr>
                <tr class="profile">
                  <td class="name">UserName3</td>
                  <td class="surname">UserSurname3</td>
                  <td class="phone">+12345678903</td>
                </tr>
                <tr class="profile">
                  <td class="name">UserName4</td>
                  <td class="surname">UserSurname4</td>
                  <td class="phone">+12345678904</td>
                </tr>
            </table>
        `,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          scope: '.profile',
          collection: [[
            {
              name: 'name',
              scope: '.name',
            },
            {
              name: 'surname',
              scope: '.surname',
            },
            {
              name: 'phone',
              scope: '.phone',
            },
          ]],
        },
      });

      expect(result).toEqual([
        { name: 'UserName1', surname: 'UserSurname1', phone: '+12345678901' },
        { name: 'UserName2', surname: 'UserSurname2', phone: '+12345678902' },
        { name: 'UserName3', surname: 'UserSurname3', phone: '+12345678903' },
        { name: 'UserName4', surname: 'UserSurname4', phone: '+12345678904' },
      ]);
    });
  });
});
