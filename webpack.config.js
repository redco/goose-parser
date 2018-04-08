const webpack = require('webpack');

module.exports = {
    entry: './browser.js',
    output: {
        path: __dirname,
        filename: "build/browser.bundle.js"
    },
    module: {
        loaders: [
            {
                test: /\.js$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel'
            }
        ]
    },
    plugins: [
        new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en|ru/)
    ]
};
