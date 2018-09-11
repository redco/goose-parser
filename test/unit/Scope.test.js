/* eslint-env jest */

const Scope = require('../../lib/Scope');

describe('Scope Api', () => {
  let scope;

  test('newly created scope should be empty', async () => {
    scope = new Scope([]);
    expect(scope.isEmpty()).toEqual(true);
  });

  test('methods push,pop,getSelector', async () => {
    scope = new Scope();
    scope.push('scope', 'parent');
    scope.push('scope2');
    scope.push('scope3');
    scope.push('scope4', 'parent4');
    expect(scope.getSelector()).toEqual('parent4 scope4');
    let data = scope.pop();
    expect(data).toEqual({ scope: 'scope4', parentScope: 'parent4' });
    expect(scope.getSelector()).toEqual('parent scope scope2 scope3');
    data = scope.pop();
    expect(data).toEqual({ scope: 'scope3', parentScope: '' });
    expect(scope.getSelector()).toEqual('parent scope scope2');
    data = scope.pop();
    expect(data).toEqual({ scope: 'scope2', parentScope: '' });
    expect(scope.getSelector()).toEqual('parent scope');
    data = scope.pop();
    expect(data).toEqual({ scope: 'scope', parentScope: 'parent' });
    expect(scope.getSelector()).toEqual('');
  });
});
