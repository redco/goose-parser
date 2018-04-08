/**
 * @param {Array.<String>} [data]
 * @constructor
 */
function Scope(data = []) {
    this._scopes = data;
}

Scope.prototype = {
    /**
     * Push scope for future execution
     * @param {string} scope
     * @param {string?} parentScope
     */
    push: function(scope, parentScope = '') {
        this._scopes.push({scope, parentScope});
    },

    /**
     * Pop scope
     * @returns {Object}
     */
    pop: function() {
        return this._scopes.pop();
    },

    /**
     * Get current parsing selector
     * @returns {string}
     */
    getSelector: function() {
        const scopes = this._scopes,
            selector = [];
        for (let i = scopes.length - 1; i >= 0; i--) {
            const scope = scopes[i];
            selector.unshift(scope.scope);

            if (scope.parentScope) {
                selector.unshift(scope.parentScope);
                break;
            }
        }

        return selector.join(' ');
    },

    isEmpty: function() {
        return this._scopes.length === 0;
    }
};

module.exports = Scope;
