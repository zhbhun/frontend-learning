const path = require('path');
const webpack = require('webpack');

const PROJECT_DIR = path.resolve(__dirname);
const NODEMODULES_PATH = path.resolve(PROJECT_DIR, './node_modules');

module.exports = {
  entry: {
    'antd-demo': [path.resolve(PROJECT_DIR, './src/index.js')],
  },
  output: {
    path: path.resolve(PROJECT_DIR, './dist'),
    filename: '[name].dll.js',
    library: '[name]_library',
    pathinfo: true,
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /src/,
        loader: 'babel?cacheDirectory',
      },
    ],
  },
  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
          warnings: false,
      },
    }),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('production')
      }
    }),
    new webpack.DllPlugin({
      path: path.resolve(PROJECT_DIR, './dist/[name]-manifest.json'),
      name: '[name]_library',
    }),
  ],
}
