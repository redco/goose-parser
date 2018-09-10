/* eslint-env jest */

const Storage = require('../../lib/Storage');

describe('Storage Api', () => {
  let storage;

  test('return value after creating storage', async () => {
    storage = new Storage({
      one: 1,
    });

    const result = storage.get('one');
    expect(result).toEqual(1);
  });

  test('return value after creating storage', async () => {
    storage = new Storage();

    storage.set('one', 1);

    const result = storage.get('one');
    expect(result).toEqual(1);
  });

  test('after unset value shouldn\'t be in the storage', async () => {
    storage = new Storage();

    storage.set('one', 1);
    storage.unset('one');

    const result = storage.get('one');
    expect(result).toEqual(undefined);
  });
});
