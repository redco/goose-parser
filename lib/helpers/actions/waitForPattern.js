module.exports = function(scope, pattern) {
    return {
        scope,
        pattern: pattern.source
    };
};
