const path = require('path');
const webpack = require('webpack');

const prodConfig = require('./dll.prod.config');

const PROJECT_DIR = path.resolve(__dirname, '../');

const config = Object.assign({}, prodConfig, {
  entry: {
    antd: [
      path.resolve(PROJECT_DIR, './src/vendor/antd.js'),
    ],
  },
});

config.plugins = [].concat(prodConfig.plugins).concat([
  new webpack.DllReferencePlugin({
    context: '.',
    manifest: require('./dll/polyfill-manifest.json'),
  }),
  new webpack.DllReferencePlugin({
    context: '.',
    manifest: require('./dll/common-manifest.json'),
  }),
  new webpack.DllReferencePlugin({
    context: '.',
    manifest: require('./dll/react-manifest.json'),
  }),
]);

module.exports = config;
