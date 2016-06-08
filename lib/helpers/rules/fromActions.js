module.exports = function(actions) {
    return {
        rulesFromActions: true,
        actions: Array.isArray(actions) ? actions : [actions]
    };
};
