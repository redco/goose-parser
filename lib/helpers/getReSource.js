module.exports = function(re) {
    return [re.source, [
        re.global && 'g' || '',
        re.ignoreCase && 'i' || '',
        re.multiline && 'm' || ''
    ].join('')];
};
