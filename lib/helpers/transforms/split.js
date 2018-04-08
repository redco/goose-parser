const getReSource = require('../getReSource');

module.exports = function(separator, dataType, index) {
    return {
        separator: getReSource(separator),
        dataType,
        index
    };
};
