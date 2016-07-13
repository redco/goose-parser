module.exports = function(scope, useActionsResultOrText) {
    return {
        scope,
        useActionsResult: typeof useActionsResultOrText === 'boolean' ? useActionsResultOrText : false,
        text: typeof useActionsResultOrText === 'string' ? useActionsResultOrText : undefined
    };
};
