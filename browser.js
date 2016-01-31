window.__gooseParse = function(rule, offset, scopes) {
    window.__gooseResults = null;
    window.__gooseError = null;
    const BrowserEnvironment = require('!babel!./lib/BrowserEnvironment');
    const Parser = require('!babel!./lib/Parser');
    const env = new BrowserEnvironment;
    const parser = new Parser({environment: env});

    delete rule.inject;
    console.log('Injection..');
    parser._scopes = scopes;
    parser.clearDom = true;
    parser
        ._parseScope(rule, offset)
        .then(
            results => window.__gooseResults = results,
            error => window.__gooseError = error
        );
};
