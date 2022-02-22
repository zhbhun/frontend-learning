const webpack = require('webpack');

const baseConfig = require('./dll.base.config');

const config = Object.assign({}, baseConfig);

config.plugins = [].concat(baseConfig.plugins).concat([
  new webpack.optimize.UglifyJsPlugin({
    compress: {
      warnings: false,
    },
  }),
  new webpack.DefinePlugin({
    'process.env': {
      NODE_ENV: JSON.stringify('production'),
    },
  }),
]);

module.exports = config;
