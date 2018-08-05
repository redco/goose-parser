/* eslint-env jest */

const TransformTrim = require('../../lib/transforms/TransformTrim');
const TransformBase64Decode = require('../../lib/transforms/TransformBase64Decode');
const TransformSplit = require('../../lib/transforms/TransformSplit');

describe('Transforms', () => {
  let transform;

  describe('TransformTrim', () => {
    test('perform', async () => {
      transform = new TransformTrim({
        value: '   test   ',
      });

      expect(transform.doTransform()).toEqual('test');

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
        }
      });

      expect(transform.doTransform()).toEqual('345');
    });

    test('perform with wrong index', async () => {
      transform = new TransformSplit({
        value: '123,345,678',
        options: {
          index: 1,
        }
      });

      expect(transform.doTransform()).toEqual('345');
    });

    test('perform with specified separator', async () => {
      transform = new TransformSplit({
        value: '123:345:678',
        options: {
          separator: ':',
        }
      });

      expect(transform.doTransform()).toEqual('123');
    });

    test('perform with specified separator as regex', async () => {
      transform = new TransformSplit({
        value: '123:345:678',
        options: {
          separator: [':', 'ui'],
        }
      });

      expect(transform.doTransform()).toEqual('123');
    });

    test('perform with incorrect value', async () => {
      transform = new TransformSplit({
        value: ['123'],
      });

      expect(transform.doTransform()).toEqual('');
    });
  });
});
