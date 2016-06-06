module.exports = function(condition) {
    const res = {
        type: 'conditionalActions',
        conditions: Array.isArray(condition) ? condition : [condition]
    };

    Object.defineProperty(res, '$then', {
        enumerable: false,
        value(actions) {
            this.actions = Array.isArray(actions) ? actions : [actions];
            return this;
        }
    });

    Object.defineProperty(res, '$else', {
        enumerable: false,
        value(actions) {
            this.elseActions = Array.isArray(actions) ? actions : [actions];
            return this;
        }
    });

    return res;
};
