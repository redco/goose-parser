/* eslint-env jest */

const TransformDate = require('../../../lib/transforms/TransformDate');
const Transform = require('../../../lib/transforms/Transform');
const transformsFactory = require('../../../lib/transforms/transformsFactory');

describe('transformsFactory', () => {
  test('createTransform returns instance for correct options.type', async () => {
    const transform = transformsFactory.createTransform({
      options: {
        type: 'date',
      },
    });

    expect(transform).toBeInstanceOf(TransformDate);
  });

  test('createTransform returns null for incorrect options.type', async () => {
    const transform = transformsFactory.createTransform({
      options: {
        type: 'wrongType',
      },
    });

    expect(transform).toEqual(null);
  });

  test('addTransform should throw a error if first param is not string', async () => {
    const fn = () => {
      return transformsFactory.addTransform([], () => {
      });
    };

    expect(fn).toThrowError(/^addTransform accept "type" as string and "transform" as function which does transformation$/);
  });

  test('addTransform should throw a error if second param is not function', async () => {
    const fn = () => {
      return transformsFactory.addTransform('newType', []);
    };

    expect(fn).toThrowError(/^addTransform accept "type" as string and "transform" as function which does transformation$/);
  });

  test('createTransform should return CustomTransform', async () => {
    transformsFactory.addTransform('newType', (value) => {
      console.log('payload', value);
      return (value || '').toUpperCase();
    });
    const transform = transformsFactory.createTransform({
      options: {
        type: 'newType',
      },
      value: 'string',
    });

    expect(transform).toBeInstanceOf(Transform);
    expect(transform.doTransform()).toEqual('STRING');
  });

});
