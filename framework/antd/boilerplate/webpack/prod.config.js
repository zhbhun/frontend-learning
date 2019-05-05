const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const ROOT_DIR = path.resolve(__dirname, '../../');
const PROJECT_DIR = path.resolve(__dirname, '../');
const NODEMODULES_PATH = path.resolve(PROJECT_DIR, './node_modules');

module.exports = {
  entry: {
    prod: [
      'antd/dist/antd.less',
      path.resolve(PROJECT_DIR, './src/vendor/polyfill.js'),
      path.resolve(PROJECT_DIR, './src/index.js'),
    ],
  },
  output: {
    path: path.resolve(PROJECT_DIR, './dist'),
    filename: 'bundle.js',
    pathinfo: true,
  },
  resolve: {
    alias: {
      'antd-demo': path.resolve(ROOT_DIR, './antd-demo/src'),
    },
    extensions: ['', '.js', '.jsx'],
    root: [
      path.resolve(NODEMODULES_PATH),
    ],
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /src/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.css$/,
        loader: ExtractTextPlugin.extract('css'),
      }, {
        test: /\.less$/,
        loader: ExtractTextPlugin.extract('css!less?'),
      }, {
        test: /\.(gif|png|jpg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?mimetype=image/png',
      }, {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/font-woff',
      }, {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/font-woff',
      }, {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/octet-stream',
      }, {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000',
      }, {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=image/svg+xml',
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
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.DedupePlugin(),
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
    new ExtractTextPlugin('bundle.css', {
      allChunks: true,
    }),
    new webpack.DllReferencePlugin({
      context: '.',
      manifest: require('./dll/polyfill-manifest.json'),
    }),
    new webpack.DllReferencePlugin({
      context: '.',
      manifest: require('./dll/react-manifest.json'),
    }),
    new webpack.DllReferencePlugin({
      context: '.',
      manifest: require('./dll/router-manifest.json'),
    }),
    new webpack.DllReferencePlugin({
      context: '.',
      manifest: require('./dll/antd-manifest.json'),
    }),
  ],
  cache: true,
};
