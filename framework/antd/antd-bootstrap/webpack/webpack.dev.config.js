const path = require('path');
const webpack = require('webpack');
const { host, port } = require('./constants');

const ADDRESS = `http://${host}:${port}/`;
const ROOT_DIR = path.resolve(__dirname, '../../');
const PROJECT_DIR = path.resolve(__dirname, '../');
const NODEMODULES_PATH = path.resolve(PROJECT_DIR, './node_modules');

module.exports = {
  entry: [
    `webpack-hot-middleware/client?path=${ADDRESS}__webpack_hmr`,
    path.resolve(PROJECT_DIR, './src/index.js'),
  ],
  resolve: {
    alias: {
      'antd-demo': path.resolve(ROOT_DIR, './antd-demo/src'),
      'antd-boilerplate': path.resolve(ROOT_DIR, './boilerplate/src'),
    },
    root: [
      path.resolve(PROJECT_DIR, './node_modules'),
    ],
    extensions: ['', '.js', '.jsx'],
  },
  output: {
    path: path.resolve(PROJECT_DIR, './dist'),
    filename: 'bundle.js',
    publicPath: ADDRESS,
    pathinfo: true
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /boilerplate/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.jsx?$/,
        include: /(antd-demo)/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.jsx?$/,
        include: /src/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.css$/,
        loader: 'style!css?sourceMap&-restructuring!postcss-loader'
      }, {
        test: /\.less$/,
        loader: 'style!css?sourceMap&-restructuring!postcss-loader!less?sourceMap'
      }, {
        test: /\.(gif|png|jpg)(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?mimetype=image/png'
      }, {
        test: /\.woff(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/font-woff'
      }, {
        test: /\.woff2(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/font-woff'
      }, {
        test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=application/octet-stream'
      }, {
        test: /\.eot(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'file'
      }, {
        test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
        loader: 'url?limit=10000&minetype=image/svg+xml'
      },
    ],
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify('development')
      }
    })
  ],
  debug: true,
  devtool: 'cheap-source-map',
  cache: true,
};
