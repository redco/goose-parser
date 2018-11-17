/* eslint-env jest */

const { createTestServer, setServerResponse, url } = require('../../tools');
const Parser = require('../../../lib/Parser');
const ChromeEnvironment = require('goose-chrome-environment');

jest.setTimeout(20000);
describe('Actions', () => {
  let testServer;
  let parser;

  beforeAll(async () => {
    testServer = await createTestServer();
    parser = new Parser({
      environment: new ChromeEnvironment({}),
      mode: 'multiple',
    });
  });

  afterAll(async () => {
    await testServer.close();
    await parser.finish();
  });

  describe('ActionBlur', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('blur', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'focus',
            scope: '[type="text"]',
          },
          {
            type: 'blur',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionClick', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('click', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionMouseClick', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('click', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'mouseClick',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionMouseDown', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('mousedown', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'mouseDown',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionMouseUp', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('mouseup', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'mouseUp',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionFocus', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<input type="text" value="0" />`,
        fn: () => {
          document.querySelector('[type="text"]').addEventListener('focus', ({ target }) => {
            const value = '1';
            target.value = value;
            target.setAttribute('value', value);
          });
        },
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'focus',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 50,
          },
        ],
        rules: {
          scope: '[type="text"]',
          attr: 'value',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionClickWithWaitForPage', () => {
    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a href="/test">test</a>`
        },
        {
          route: '/test',
          html: `<a href="/">1</a>`
        }
      ]);
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: 'page',
          },
        ],
        rules: {
          scope: 'a',
        },
      });

      expect(result).toEqual('1');
    });
  });

  describe('ActionClickWithWaitForPattern', () => {
    test('perform', async () => {
      setServerResponse({
          html: `<a href="#">test</a>`,
          fn: () => {
            // the phone number appears after some time in the link
            document.querySelector('a').addEventListener('click', ({ target }) => {
              setTimeout(function () {
                target.setAttribute('href', 'tel:+123456890102');
              }, 500);
            });
          }
        });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: {
              type: 'pattern',
              pattern: '^tel:',
              scope: 'a',
              attr: 'href',
            },
          },
        ],
        rules: {
          scope: 'a',
          attr: 'href',
        },
      });

      expect(result).toEqual('tel:+123456890102');
    });
  });

  describe('ActionClickWithWaitForVisible', () => {
    test('wait visible', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`,
        fn: () => {
          document.querySelector('a').addEventListener('click', ({ target }) => {
            setTimeout(function () {
              document.body.insertAdjacentHTML('beforeend', '<div>12345</div>');
            }, 500);
          });
        }
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: {
              type: 'visible',
              scope: 'div',
            },
          },
        ],
        rules: {
          scope: 'div',
        },
      });

      expect(result).toEqual('12345');
    });

    test('wait invisible', async () => {
      setServerResponse({
        html: `<a href="#">test</a><div>12345</div>`,
        fn: () => {
          document.querySelector('a').addEventListener('click', ({ target }) => {
            setTimeout(function () {
              document.querySelector('div').remove();
            }, 500);
          });
        }
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: {
              type: 'visible',
              scope: 'div',
              visibility: false,
            },
          },
        ],
        rules: {
          scope: 'div',
        },
      });

      expect(result).toEqual('');
    });
  });

  describe('ActionWaitForElement', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`,
        fn: () => {
          document.querySelector('a').addEventListener('click', ({ target }) => {
            setTimeout(function () {
              document.body.insertAdjacentHTML('beforeend', '<div>12345</div>');
            }, 500);
          });
        }
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: {
              type: 'element',
              scope: 'div',
            },
          },
        ],
        rules: {
          scope: 'div',
        },
      });

      expect(result).toEqual('12345');
    });
  });

  describe('ActionClickWithWaitForQuery', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`,
        fn: () => {
          // the phone number appears after some time in the link
          document.querySelector('a').addEventListener('click', ({ target }) => {
            document.body.insertAdjacentHTML('beforeend', '<img src="12345" />');
          });
        }
      });
      const result = await parser.parse({
        url,
        actions: [
          {
            type: 'click',
            scope: 'a',
            waitFor: {
              type: 'query',
              uri: '12345',
            },
          },
        ],
        rules: {
          scope: 'img',
          attr: 'src'
        },
      });

      expect(result).toEqual('12345');
    });
  });
});
