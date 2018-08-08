/* eslint-env jest */

const TransformTrim = require('../../../lib/transforms/TransformTrim');
const TransformBase64Decode = require('../../../lib/transforms/TransformBase64Decode');
const TransformSplit = require('../../../lib/transforms/TransformSplit');
const TransformCombine = require('../../../lib/transforms/TransformCombine');
const TransformCompare = require('../../../lib/transforms/TransformCompare');
const TransformDecodeHtml = require('../../../lib/transforms/TransformDecodeHtml');
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
});
