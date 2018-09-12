/* eslint-env jest */

const debug = require('debug')('Transform');
const Storage = require('../../../lib/Storage');
const Transform = require('../../../lib/transforms/Transform');

jest.mock('../../../lib/Storage');
jest.mock('debug', () => {
  return jest.fn(() => {
    if (!this.__fn) {
      this.__fn = jest.fn((...args) => {
      });
    }
    return this.__fn;
  });
});

describe('Transform', () => {
  let transform;
  let storage;

  beforeAll(async () => {
    storage = new Storage({});
  });

  describe('Transform', () => {
    test('doTransform should throw a error', async () => {
      transform = new Transform({
        value: 'value',
        storage,
      });

      const fn = () => {
        return transform.doTransform();
      };

      expect(fn).toThrowError(/^You must redefine this method in the child class$/);
    });

    test('log', async () => {
      const transformType = 'TestTransform';
      const message = 'Test Message';
      transform = new Transform({
        options: {
          type: transformType,
        },
        value: 'value',
        storage,
      });

      transform.log(message);
      expect(debug).toHaveBeenCalledTimes(1);
      expect(debug).toHaveBeenCalledWith(`[${transformType}] ${message}`);
    });

    test('transform', async () => {
      const transformType = 'TestTransform';
      const message = 'Test Message';
      transform = new Transform({
        options: {
          type: transformType,
        },
        value: 'value',
        storage,
      });
      transform.doTransform = jest.fn(() => {
        return 'transformedValue';
      });
      transform.log = jest.fn(() => {
      });

      const transformedValue = transform.transform();
      expect(transformedValue).toEqual('transformedValue');
      expect(transform.doTransform).toHaveBeenCalledTimes(1);
      expect(transform.log).toHaveBeenCalledTimes(2);
      expect(transform.log).toHaveBeenCalledWith(
        'applied with options %o on value %o',
        {
          type: transformType,
        },
        'value',
      );
      expect(transform.log).toHaveBeenCalledWith(
        'transformed result',
        'transformedValue',
      );
    });
  });
});
