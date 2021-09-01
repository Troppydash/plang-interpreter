const path = require("path");
const nodeExternals = require('webpack-node-externals');

module.exports = {
    target: 'node',
    mode: "production",
    entry: {
        'deviation': './src/browser/compiler.ts',
    },
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: '[name].js',
        libraryTarget: "umd",
        library: 'deviation',
        umdNamedDefine: true
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    externals: [nodeExternals()],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                loader: 'ts-loader',
                exclude: /node_modules/,
            }
        ],
    }
};
