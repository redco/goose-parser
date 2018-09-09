class Scope {
  /**
   * @param {Array.<String>} [data]
   */
  constructor(data = []) {
    this._scopes = data;
  }

  /**
   * Push scope for future execution
   * @param {string} scope
   * @param {string?} parentScope
   */
  push(scope, parentScope = '') {
    this._scopes.push({ scope, parentScope });
  }

  /**
   * Pop scope
   * @returns {Object}
   */
  pop() {
    return this._scopes.pop();
  }

  /**
   * Get current parsing selector
   * @returns {string}
   */
  getSelector() {
    const scopes = this._scopes;
    const selector = [];
    for (let i = scopes.length - 1; i >= 0; i--) {
      const scope = scopes[i];
      selector.unshift(scope.scope);

      if (scope.parentScope) {
        selector.unshift(scope.parentScope);
        break;
      }
    }

    return selector.join(' ');
  }

  isEmpty() {
    return this._scopes.length === 0;
  }
}

module.exports = Scope;
