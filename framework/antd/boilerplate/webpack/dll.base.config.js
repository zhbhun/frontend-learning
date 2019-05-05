const path = require('path');
const webpack = require('webpack');

const PROJECT_DIR = path.resolve(__dirname, '../');
const NODEMODULES_PATH = path.resolve(PROJECT_DIR, './node_modules');

module.exports = {
  output: {
    path: path.resolve(PROJECT_DIR, './dist'),
    filename: '[name].dll.js',
    library: '[name]_library',
    // pathinfo: true,
  },
  resolve: {
    root: [
      path.resolve(NODEMODULES_PATH),
    ],
    modulesDirectories: [],
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /src/,
        loader: 'babel?cacheDirectory',
      },
    ],
    postLoaders: [
      {
        test: /\.jsx?$/,
        loaders: ['es3ify-loader'],
      },
    ],
  },
  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(true),
    new webpack.DllPlugin({
      path: path.resolve(__dirname, './dll/[name]-manifest.json'),
      name: '[name]_library',
    }),
  ],
};
