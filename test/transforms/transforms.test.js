/* eslint-env jest */

const TransformTrim = require('../../lib/transforms/TransformTrim');
const TransformBase64Decode = require('../../lib/transforms/TransformBase64Decode');

describe('Transforms', () => {
  let base64decoder;

  describe('TransformTrim', () => {
    test('perform', async () => {
      base64decoder = new TransformTrim({
        value: '   test   ',
      });

      expect(base64decoder.doTransform()).toEqual('test');

      base64decoder = new TransformTrim({
        value: 12345,
      });

      expect(base64decoder.doTransform()).toEqual(12345);
    });
  });

  describe('TransformBase64Decode', () => {
    test('perform', async () => {
      base64decoder = new TransformBase64Decode({
        value: 'dGVzdA==',
      });

      expect(base64decoder.doTransform()).toEqual('test');
    });
  });
});
