const path = require('path');
const webpack = require('webpack');

const baseConfig = require('./dll.base.config');

const PROJECT_DIR = path.resolve(__dirname, '../');

const config = Object.assign({}, baseConfig, {
  entry: {
    dev: [
      path.resolve(PROJECT_DIR, './src/vendor/polyfill.js'),
      path.resolve(PROJECT_DIR, './src/vendor/common.js'),
      path.resolve(PROJECT_DIR, './src/vendor/react.js'),
      path.resolve(PROJECT_DIR, './src/vendor/router.js'),
      path.resolve(PROJECT_DIR, './src/vendor/antd.js'),
    ],
  },
});

config.plugins = [].concat(baseConfig.plugins).concat([
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify('development'),
    },
  }),
]);

module.exports = config;
