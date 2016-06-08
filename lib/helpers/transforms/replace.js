const getReSource = require('../getReSource');

module.exports = function(re, to) {
    return {
        re: getReSource(re),
        to
    };
};
