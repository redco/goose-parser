/* eslint-env jest */

const TransformTrim = require('../../../lib/transforms/TransformTrim');
const TransformBase64Decode = require('../../../lib/transforms/TransformBase64Decode');
const TransformSplit = require('../../../lib/transforms/TransformSplit');
const TransformCombine = require('../../../lib/transforms/TransformCombine');
const TransformCompare = require('../../../lib/transforms/TransformCompare');
const TransformDecodeHtml = require('../../../lib/transforms/TransformDecodeHtml');
const TransformDecodeUri = require('../../../lib/transforms/TransformDecodeUri');
const TransformEncodeUri = require('../../../lib/transforms/TransformEncodeUri');
const TransformEqual = require('../../../lib/transforms/TransformEqual');
const TransformGet = require('../../../lib/transforms/TransformGet');
const TransformJoin = require('../../../lib/transforms/TransformJoin');
const TransformMatch = require('../../../lib/transforms/TransformMatch');
const TransformPick = require('../../../lib/transforms/TransformPick');
const Storage = require('../../../lib/Storage');

jest.mock('../../../lib/Storage');

describe('Transforms', () => {
  let transform;
  let storage;

  beforeAll(async () => {
    storage = new Storage({});
  });

  describe('TransformTrim', () => {
    test('perform with string', async () => {
      transform = new TransformTrim({
        value: '   test   ',
      });

      expect(transform.doTransform()).toEqual('test');
    });

    test('perform with non-string', async () => {
      transform = new TransformTrim({
        value: 12345,
      });

      expect(transform.doTransform()).toEqual(12345);
    });
  });

  describe('TransformBase64Decode', () => {
    test('perform', async () => {
      transform = new TransformBase64Decode({
        value: 'dGVzdA==',
      });

      expect(transform.doTransform()).toEqual('test');
    });
  });

  describe('TransformSplit', () => {
    test('perform with all default values', async () => {
      transform = new TransformSplit({
        value: '123,345,678',
      });

      expect(transform.doTransform()).toEqual('123');
    });

    test('perform with specified index', async () => {
      transform = new TransformSplit({
        value: '123,345,678',
        options: {
          index: 1,
        },
      });

      expect(transform.doTransform()).toEqual('345');
    });

    test('perform with wrong index', async () => {
      transform = new TransformSplit({
        value: '123,345,678',
        options: {
          index: 5,
        },
      });

      expect(transform.doTransform()).toEqual(null);
    });

    test('perform with specified separator', async () => {
      transform = new TransformSplit({
        value: '123:345:678',
        options: {
          separator: ':',
        },
      });

      expect(transform.doTransform()).toEqual('123');
    });

    test('perform with specified separator as regex', async () => {
      transform = new TransformSplit({
        value: '123:345:678',
        options: {
          separator: [':', 'ui'],
        },
      });

      expect(transform.doTransform()).toEqual('123');
    });

    test('perform with incorrect value', async () => {
      transform = new TransformSplit({
        value: ['123'],
      });

      expect(transform.doTransform()).toEqual('');
    });

    test('perform with specified dataType', async () => {
      transform = new TransformSplit({
        value: '123,345,678',
        options: {
          dataType: 'array',
        },
      });

      expect(transform.doTransform()).toEqual([
        '123',
        '345',
        '678',
      ]);
    });
  });

  describe('TransformCombine', () => {
    test('perform with default values', async () => {
      transform = new TransformCombine({});

      expect(transform.doTransform()).toEqual([]);
    });

    test('perform with data', async () => {
      const data = {
        'one': '1',
        'two': '2',
      };
      storage.get.mockClear();
      storage.get.mockImplementation((key) => data[key]);
      transform = new TransformCombine({
        options: {
          fields: [
            'one',
            'two',
          ],
        },
        storage,
      });

      expect(transform.doTransform()).toEqual(['1', '2']);

      expect(storage.get).toHaveBeenCalledTimes(2);
      expect(storage.get).toHaveBeenCalledWith('one');
      expect(storage.get).toHaveBeenCalledWith('two');
    });

    const checkCombineWithDataType = (dataType, result) => {
      const data = {
        'one': '1',
        'two': '2',
      };
      storage.get.mockClear();
      storage.get.mockImplementation((key) => data[key]);
      transform = new TransformCombine({
        options: {
          fields: [
            'one',
            'two',
          ],
          dataType,
        },
        storage,
      });

      expect(transform.doTransform()).toEqual(result);

      expect(storage.get).toHaveBeenCalledTimes(2);
      expect(storage.get).toHaveBeenCalledWith('one');
      expect(storage.get).toHaveBeenCalledWith('two');
    };

    test('perform with data and data dataType=int.integer', async () => {
      checkCombineWithDataType('int', [1, 2]);
      checkCombineWithDataType('integer', [1, 2]);
    });

    test('perform with data and data dataType=float,number,double', async () => {
      checkCombineWithDataType('float', [1.0, 2.0]);
      checkCombineWithDataType('double', [1.0, 2.0]);
      checkCombineWithDataType('number', [1.0, 2.0]);
    });
  });

  describe('TransformCompare', () => {
    test('perform with data returning true value', async () => {
      const data = {
        'one': '1',
      };
      storage.get.mockClear();
      storage.get.mockImplementation((key) => data[key]);
      transform = new TransformCompare({
        options: {
          field: 'one',
        },
        value: '1',
        storage,
      });

      expect(transform.doTransform()).toEqual(true);

      expect(storage.get).toHaveBeenCalledTimes(1);
      expect(storage.get).toHaveBeenCalledWith('one');
    });

    test('perform with data returning false value', async () => {
      const data = {
        'one': '1',
      };
      storage.get.mockClear();
      storage.get.mockImplementation((key) => data[key]);
      transform = new TransformCompare({
        options: {
          field: 'two',
        },
        value: '1',
        storage,
      });

      expect(transform.doTransform()).toEqual(false);

      expect(storage.get).toHaveBeenCalledTimes(1);
      expect(storage.get).toHaveBeenCalledWith('two');
    });
  });

  describe('TransformDecodeHtml', () => {
    test('perform', async () => {
      transform = new TransformDecodeHtml({
        value: '&lt;&gt;&quot;&amp;&copy;&reg;',
      });

      expect(transform.doTransform()).toEqual('<>"&©®');
    });
  });

  describe('TransformDecodeUri', () => {
    test('perform', async () => {
      transform = new TransformDecodeUri({
        value: 'https://www.google.com/?q=goose-parser%20is%20a%20library%20for%20parsing',
      });

      expect(transform.doTransform()).toEqual('https://www.google.com/?q=goose-parser is a library for parsing');
    });
  });

  describe('TransformEncodeUri', () => {
    test('perform', async () => {
      transform = new TransformEncodeUri({
        value: 'https://www.google.com/?q=goose-parser is a library for parsing',
      });

      expect(transform.doTransform()).toEqual('https://www.google.com/?q=goose-parser%20is%20a%20library%20for%20parsing');
    });
  });

  describe('TransformEqual', () => {
    test('perform with returning true', async () => {
      transform = new TransformEqual({
        value: 'one',
        options: {
          value: 'one',
        },
      });

      expect(transform.doTransform()).toEqual(true);
    });

    test('perform returning false', async () => {
      transform = new TransformEqual({
        value: 'one',
        options: {
          value: 'two',
        },
      });

      expect(transform.doTransform()).toEqual(false);
    });
  });

  describe('TransformGet', () => {
    test('perform', async () => {
      transform = new TransformGet({
        value: {
          one: {
            two: 'three',
          },
        },
        options: {
          path: 'one.two',
        },
      });

      expect(transform.doTransform()).toEqual('three');
    });

    test('perform wrong path without default', async () => {
      transform = new TransformGet({
        value: {
          one: {
            two: 'three',
          },
        },
        options: {
          path: 'one.three',
        },
      });

      expect(transform.doTransform()).toEqual('');
    });

    test('perform wrong path with default', async () => {
      transform = new TransformGet({
        value: {
          one: {
            two: 'three',
          },
        },
        options: {
          path: 'one.three',
          default: 'four',
        },
      });

      expect(transform.doTransform()).toEqual('four');
    });
  });

  describe('TransformJoin', () => {
    test('perform without glue', async () => {
      transform = new TransformJoin({
        value: ['one', 'two', 'three'],
      });

      expect(transform.doTransform()).toEqual('one two three');
    });

    test('perform with glue', async () => {
      transform = new TransformJoin({
        value: ['one', 'two', 'three'],
        options: {
          glue: ', ',
        },
      });

      expect(transform.doTransform()).toEqual('one, two, three');
    });

    test('perform with wrong value', async () => {
      transform = new TransformJoin({
        value: 'one two',
      });

      expect(transform.doTransform()).toEqual('one two');
    });
  });

  describe('TransformMatch', () => {
    test('perform with default value', async () => {
      transform = new TransformMatch({
        value: 'one/two/three',
        options: {
          re: [
            '^([^/]+)/([^/]+)/([^/]+)$',
          ],
        },
      });

      expect(transform.doTransform()).toEqual('one/two/three');
    });

    test('perform with specified index', async () => {
      transform = new TransformMatch({
        value: 'one/two/three',
        options: {
          re: [
            '^([^/]+)/([^/]+)/([^/]+)$',
          ],
          index: 1,
        },
      });

      expect(transform.doTransform()).toEqual('one');
    });

    test('perform with index=any returning true', async () => {
      transform = new TransformMatch({
        value: 'one/two/three',
        options: {
          re: [
            '^([^/]+)/([^/]+)/([^/]+)$',
          ],
          index: 'any',
        },
      });

      expect(transform.doTransform()).toEqual(true);
    });

    test('perform with index=any returning false', async () => {
      transform = new TransformMatch({
        value: 'one/two/three',
        options: {
          re: [
            '^([^/]+)\\.([^/]+)\\.([^/]+)$',
          ],
          index: 'any',
        },
      });

      expect(transform.doTransform()).toEqual(false);
    });

    test('perform with index=all', async () => {
      transform = new TransformMatch({
        value: 'one',
        options: {
          re: [
            '(.+)',
            'g'
          ],
          index: 'all',
        },
      });
      expect(transform.doTransform()).toEqual(['one']);
    });

    test('perform returning no matches', async () => {
      transform = new TransformMatch({
        value: 'one',
        options: {
          re: [
            'two',
          ],
        },
      });
      expect(transform.doTransform()).toEqual(null);
    });

    test('perform with wrong value', async () => {
      transform = new TransformMatch({
        value: ['one'],
        options: {
          re: [
            'one',
          ],
        },
      });
      expect(transform.doTransform()).toEqual(null);
    });

    test('perform with wrong index', async () => {
      transform = new TransformMatch({
        value: 'one',
        options: {
          re: [
            'one',
          ],
          index: 7,
        },
      });
      expect(transform.doTransform()).toEqual(null);
    });

    test('perform with index as array', async () => {
      transform = new TransformMatch({
        value: 'one',
        options: {
          re: [
            'one',
          ],
          index: [0, 7],
        },
      });
      expect(transform.doTransform()).toEqual('one');
    });
  });

  describe('TransformPick', () => {
    test('perform', async () => {
      transform = new TransformPick({
        value: {
          one: '1',
          two: '2',
          three: '3',
        },
        options: {
          prop: ['one', 'three']
        },
      });

      expect(transform.doTransform()).toEqual({
        one: '1',
        three: '3',
      });
    });
  });
});
