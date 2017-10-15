module.exports = {
    Environment: require('./lib/Environment'),
    JsDOMEnvironment: require('./lib/JsDOMEnvironment'),
    ChromeEnvironment: require('./lib/PuppeteerEnvironment'),
    BrowserEnvironment: require('./lib/BrowserEnvironment'),

    Parser: require('./lib/Parser')
};
