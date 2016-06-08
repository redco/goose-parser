const getReSource = require('../getReSource');

module.exports = function(re, index) {
    return {
        re: getReSource(re),
        index
    };
};
