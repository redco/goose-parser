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
          window.addEventListener('mousedown', () => {
            const value = '1';
            const target = document.querySelector('[type="text"]');
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
          window.addEventListener('mousedown', () => {
            const value = '1';
            const target = document.querySelector('[type="text"]');
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
      setServerResponse([
        {
          route: '/',
          html: `<a href="#">test</a>`,
          fn: () => {
            // the phone number appears after some time in the link
            document.querySelector('a').addEventListener('click', ({ target }) => {
              document.body.insertAdjacentHTML('beforeend', '<img src="12345" />');
            });
          }
        },
        {
          route: '/12345',
          html: '',
        },
      ]);
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

  describe('ActionProvideRules', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<span>test</span><input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'provideRules',
              rules: {
                scope: 'span',
              }
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform with no rules', async () => {
      setServerResponse({
        html: `<span>test</span><input type="text" />`,
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'provideRules',
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('');
    });
  });

  describe('ActionExist', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'exists',
                  scope: 'a',
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform exist child', async () => {
      setServerResponse({
        html: `<span>global<a href="#">test</a></span>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'exists',
                  scope: 'span',
                  child: 1,
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'span',
                    child: 1,
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionCondition', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'exists',
                  scope: 'span',
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'span',
                  },
                }
              ],
              else: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'condition',
          },
        ],
      });

      expect(result).toEqual('');
    });
  });

  describe('ActionOr', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'or',
                  actions: [
                    {
                      type: 'exists',
                      scope: 'span',
                    },
                    {
                      type: 'exists',
                      scope: 'a',
                    }
                  ]
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'or',
                  actions: [
                    {
                      type: 'exists',
                      scope: 'a',
                    },
                    {
                      type: 'exists',
                      scope: 'span',
                    },
                  ]
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform without or values', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'or',
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'span',
                  },
                }
              ],
              else: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionNot', () => {
    test('perform', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'not',
                  actions: [
                    {
                      type: 'exists',
                      scope: 'span',
                    },
                  ]
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });

    test('perform without or values', async () => {
      setServerResponse({
        html: `<a href="#">test</a>`
      });
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: 'not',
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'a',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionHasRedirect', () => {
    test('perform', async () => {
      setServerResponse([
        {
          html: ``,
          headers: [
            {
              name: "Location",
              value: `${url}test`,
            }
          ],
          code: 302,
          route: '/'
        },
        {
          route: '/test',
          html: `<span>test</span>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'condition',
              if: [
                {
                  type: "hasRedirect"
                }
              ],
              then: [
                {
                  type: 'provideRules',
                  rules: {
                    scope: 'span',
                  },
                }
              ],
            },
          ],
          rulesFromActions: true,
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionBack', () => {
    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a href="/test">test</a>`
        },
        {
          route: '/test',
          html: `<a href="#">nothing</a>`,
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
          {
            type: 'back',
          },
        ],
        rules: {
          scope: 'a'
        },
      });

      expect(result).toEqual('test');
    });
  });

  describe('ActionOpen', () => {
    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a href="/test">test</a>`
        },
        {
          route: '/test',
          html: `<a href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        actions: [
          {
            type: 'open',
            url: `${url}test`,
          },
        ],
        rules: {
          scope: 'a'
        },
      });

      expect(result).toEqual('nothing');
    });
  });

  describe('ActionCases', () => {
    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="#">test</a>`,
          fn: () => {
            document.querySelector('a').addEventListener('click', () => {
              setTimeout(() => {
                window.location = '/test';
              }, 2000);
            });
          },
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          rulesFromActions: true,
          actions: [
            {
              type: 'click',
              scope: 'a',
              cases: [
                [
                  {
                    type: 'waitForQuery',
                    timeout: 5000,
                    uri: 'tel:',
                  },
                  {
                    type: 'provideRules',
                    trueCase: true,
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
                [
                  {
                    type: 'waitForPage',
                    timeout: 5000,
                  },
                  {
                    type: 'provideRules',
                    trueCase: true,
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
              ],
            }
          ],
        },
      });

      expect(result).toEqual('nothing');
    });

    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="tel:+123456890123">test</a>`
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          rulesFromActions: true,
          actions: [
            {
              type: 'click',
              scope: 'a',
              cases: [
                [
                  {
                    type: 'waitForPage',
                    timeout: 5000,
                  },
                  {
                    type: 'provideRules',
                    trueCase: true,
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
                [
                  {
                    type: 'waitForPattern',
                    timeout: 5000,
                    pattern: '^tel:',
                    scope: 'a',
                    attr: 'href',
                  },
                  {
                    type: 'provideRules',
                    trueCase: true,
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
              ],
            }
          ],
        },
      });

      expect(result).toEqual('test');
    });

    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="tel:+123456890123">test</a>`
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          actions: [
            {
              type: 'click',
              scope: 'a',
              cases: [
                [
                  {
                    type: 'waitForPage',
                    timeout: 5000,
                  },
                ],
                [
                  {
                    type: 'waitForPattern',
                    timeout: 5000,
                    pattern: '^tel:',
                    scope: 'a',
                    attr: 'href',
                  },
                ],
              ],
            }
          ],
        },
      });

      expect(result).toEqual('');
    });

    test('perform with error', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="tel:+123456890123">test</a>`
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      try {
        await parser.parse({
          rules: {
            actions: [
              {
                type: 'click',
                scope: 'a',
                cases: [
                  [
                    {
                      type: 'waitForPage',
                      timeout: 500,
                    },
                  ],
                  [
                    {
                      type: 'waitForPattern',
                      timeout: 500,
                      pattern: '^http:',
                      scope: 'a',
                      attr: 'href',
                    },
                  ],
                ],
              }
            ],
          },
        });
      } catch (err) {
        expect(Array.isArray(err)).toEqual(true);
        expect(err.length).toEqual(2);
        err.forEach(errItem => {
          expect(errItem).toBeInstanceOf(Error);
        });
      }
    });

    test('perform', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="#">test</a>`,
          fn: () => {
            document.querySelector('a').addEventListener('click', () => {
              setTimeout(() => {
                window.location = '/test';
              }, 1000);
            });
          },
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        }
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      const result = await parser.parse({
        rules: {
          rulesFromActions: true,
          actions: [
            {
              type: 'click',
              scope: 'a',
              cases: [
                [
                  {
                    type: 'waitForQuery',
                    timeout: 2000,
                    uri: 'tel:',
                  },
                  {
                    type: 'provideRules',
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
                [
                  {
                    type: 'waitForPage',
                    timeout: 2000,
                  },
                  {
                    type: 'provideRules',
                    rules: {
                      scope: 'a'
                    }
                  }
                ],
              ],
            }
          ],
        },
      });

      expect(result).toEqual('nothing');
    });

    test('perform with error', async () => {
      setServerResponse([
        {
          route: '/',
          html: `<a id="1" href="#">test</a>`,
          fn: () => {
            setTimeout(function () {
              document.body.insertAdjacentHTML('beforeend', '<div>12345</div>');
            }, 500);
          },
        },
        {
          route: '/test',
          html: `<a id="2" href="#">nothing</a>`,
        },
      ]);
      const parser = new Parser({
        environment: new ChromeEnvironment({ url }),
      });
      try {
        await parser.parse({
          rules: {
            actions: [
              {
                type: 'click',
                scope: 'a',
                cases: [
                  [
                    {
                      type: 'waitForVisible',
                      scope: 'div',
                      timeout: 2000,
                    },
                  ],
                  [
                    {
                      type: 'waitForPattern',
                      timeout: 2000,
                      pattern: '^http:',
                      scope: 'a',
                      attr: 'href',
                    },
                  ],
                ],
              },
            ],
          },
        });
      } catch (err) {
        expect(Array.isArray(err)).toEqual(true);
        expect(err.length).toEqual(2);
        err.forEach(errItem => {
          expect(errItem).toBeInstanceOf(Error);
        });
      }
    });
  });

  // describe('ActionSnapshot', () => {
  //   test('making page snapshot', async () => {
  //     setServerResponse({
  //       html: `<span>snapshot</span>`,
  //     });
  //     const parser = new Parser({
  //       environment: new ChromeEnvironment({ url, snapshot: true, snapshotDir: '/tmp' }),
  //     });
  //     await parser.parse({
  //       actions: [
  //         {
  //           type: 'snapshot',
  //           name: 'test',
  //         },
  //       ],
  //     });
  //
  //     const filePath = '/tmp/localhost/test.png';
  //     const snapshotExists = await fileExists(filePath);
  //     expect(snapshotExists).toEqual(true);
  //     await removeFile(filePath);
  //   });
  // });
});
