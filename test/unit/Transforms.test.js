/* eslint-env jest */

const Storage = require('../../lib/Storage');
const Transforms = require('../../lib/Transforms');
const Transform = require('../../lib/transforms/Transform');
const TransformTrim = require('../../lib/transforms/TransformTrim');
const transformsFactory = require('../../lib/transforms/transformsFactory');

jest.mock('../../lib/transforms/transformsFactory');

describe('Transforms', () => {
  let transforms;
  let storage;

  beforeAll(async () => {
    storage = new Storage({});
  });

  beforeEach(async () => {
    transformsFactory.createTransform.mockReset();
  });

  test('create Transforms with default params', async () => {
    transforms = new Transforms({});

    expect(transforms._storage).toBeInstanceOf(Storage);
  });

  test('create Transforms with predefined Storage', async () => {
    transforms = new Transforms({
      storage,
    });

    expect(transforms._storage).toBeInstanceOf(Storage);
    expect(transforms._storage).toEqual(storage);
  });

  test('addTransform', async () => {
    const type = 'newTransformType';
    const transformFn = () => {
    };

    transforms = new Transforms({});
    transforms.addTransform(type, transformFn);
    expect(transformsFactory.addTransform).toHaveBeenCalledTimes(1);
    expect(transformsFactory.addTransform).toHaveBeenCalledWith(type, transformFn);
  });

  test('produce with no transforms', async () => {
    transforms = new Transforms({});
    const value = transforms.produce();
    expect(value).toEqual('');
  });

  test('produce with no value', async () => {
    transforms = new Transforms({});
    const value = transforms.produce([]);
    expect(value).toEqual('');
  });

  test('produce with transforms and no value', async () => {
    transformsFactory.createTransform.mockImplementation((options) => {
      return new TransformTrim({
        options: {},
        value: '',
      });
    });

    transforms = new Transforms({});
    const options = {
      options: {
      },
      type: 'trim',
    };
    const value = transforms.produce([options]);
    expect(transformsFactory.createTransform).toHaveBeenCalledTimes(1);
    expect(transformsFactory.createTransform).toHaveBeenCalledWith({
      options,
      value: '',
      storage: new Storage(),
    });
    expect(value).toEqual('');
  });

  test('produce with transforms and value', async () => {
    const value = '   value  ';
    transformsFactory.createTransform.mockImplementation((options) => {
      return new TransformTrim({
        options: {},
        value,
      });
    });

    transforms = new Transforms({});
    const options = {
      options: {
      },
      type: 'trim',
    };
    const result = transforms.produce([options], value);
    expect(transformsFactory.createTransform).toHaveBeenCalledTimes(1);
    expect(transformsFactory.createTransform).toHaveBeenCalledWith({
      options,
      value,
      storage: new Storage(),
    });
    expect(result).toEqual('value');
  });

  test('produce with transforms, value and transform returns nothing', async () => {
    const value = '   value  ';
    transformsFactory.createTransform.mockImplementation((options) => {
      return new (class extends Transform {
        doTransform() {
          return;
        }
      })({});
    });

    transforms = new Transforms({});
    const options = {
      options: {
      },
      type: 'custom',
    };
    const result = transforms.produce([options, options], value);
    expect(transformsFactory.createTransform).toHaveBeenCalledTimes(2);
    expect(transformsFactory.createTransform).toHaveBeenCalledWith({
      options,
      value,
      storage: new Storage(),
    });
    expect(result).toEqual(undefined);
  });

  test('produce with wrong transform type should throw a error', async () => {
    transforms = new Transforms({});
    const fn = () => {
      return transforms.produce([{
        options: {
        },
        type: 'wrongTransformType',
      }], '');
    };
    expect(fn).toThrowError(/^Unsupported transform type: wrongTransformType$/);
  });
});
