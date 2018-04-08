module.exports = function(actions, type) {
    return {
        rulesFromActions: true,
        actions: Array.isArray(actions) ? actions : [actions],
        type
    };
};
