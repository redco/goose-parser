/* eslint-env jest */

const ChromeEnvironment = require('goose-chrome-environment');
const { fileExists, removeFile, createTestServer, setServerResponse, url } = require('../../tools');
const Parser = require('../../../lib/Parser');

jest.setTimeout(30000);
describe('Actions', () => {
  let testServer;

  beforeAll(async () => {
    testServer = await createTestServer();
  });

  afterAll(async () => {
    await testServer.close();
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'mouseDown',
            scope: '[type="text"]',
          },
          {
            type: 'pause',
            timeout: 500,
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
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

  describe('ActionChangeElement', () => {
    test('change style, attr', async () => {
      setServerResponse({
        html: `<img src="12345" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'changeElement',
            scope: 'img',
            style: {
              display: 'none',
            },
            attr: {
              alt: 'test',
            },
          },
        ],
        rules: {
          collection: [
            {
              name: 'alt',
              scope: 'img',
              attr: 'alt',
            },
            {
              name: 'style',
              scope: 'img',
              attr: 'style',
            },
          ],
        },
      });

      expect(result).toEqual({ alt: 'test', style: 'display: none;' });
    });

    test('change nothing', async () => {
      setServerResponse({
        html: `<img src="12345" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'changeElement',
            scope: 'img',
          },
        ],
        rules: {
          collection: [
            {
              name: 'alt',
              scope: 'img',
              attr: 'alt',
            },
            {
              name: 'style',
              scope: 'img',
              attr: 'style',
            },
          ],
        },
      });

      expect(result).toEqual({ alt: null, style: null });
    });
  });

  describe('ActionType', () => {
    test('typing provided text', async () => {
      setServerResponse({
        html: `<input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'type',
            scope: 'input',
            text: 'test',
          },
        ],
        rules: {
          scope: 'input',
          prop: 'value'
        },
      });

      expect(result).toEqual('test');
    });

    test('typing value from prev action', async () => {
      setServerResponse({
        html: `<span>test</span><input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'parse',
            rules: {
              scope: 'span',
            },
          },
          {
            type: 'type',
            scope: 'input',
            useActionsResult: true,
          },
        ],
        rules: {
          scope: 'input',
          prop: 'value'
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionParse', () => {
    test('parse nothing', async () => {
      setServerResponse({
        html: `<span>test</span><input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'parse',
          },
          {
            type: 'type',
            scope: 'input',
            useActionsResult: true,
          },
        ],
        rules: {
          scope: 'input',
          prop: 'value'
        },
      });

      expect(result).toEqual('');
    });
  });

  describe('ActionUrl', () => {
    test('fetching page url', async () => {
      setServerResponse({
        html: `<span>test</span><input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'url',
          },
          {
            type: 'type',
            scope: 'input',
            useActionsResult: true,
          },
        ],
        rules: {
          scope: 'input',
          prop: 'value'
        },
      });

      expect(result).toEqual(url);
    });
  });

  describe('ActionSnapshot', () => {
    test('making page snapshot', async () => {
      setServerResponse({
        html: `<span>snapshot</span>`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url, /*snapshot: true*/ }),
      });
      await parser.parse({
        actions: [
          {
            type: 'snapshot',
            name: 'test',
          },
        ],
      });

      const filePath = './snapshots/localhost/test.png';
      const snapshotExists = await fileExists(filePath);
      expect(snapshotExists).toEqual(true);
      await removeFile(filePath);
    });
  });
});
