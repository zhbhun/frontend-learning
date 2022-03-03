const path = require('path');
const webpack = require('webpack');

const { host, port } = require('./constants');
const serverConfig = require('./dev.server.config');

const ADDRESS = `http://${host}:${port}/`;
const ROOT_DIR = path.resolve(__dirname, '../../');
const PROJECT_DIR = path.resolve(__dirname, '../');
const NODEMODULES_PATH = path.resolve(PROJECT_DIR, './node_modules');

module.exports = {
  entry: [
    'react-hot-loader/patch',
    `webpack-dev-server/client?${ADDRESS}`,
    'webpack/hot/only-dev-server',
    'antd/dist/antd.less',
    path.resolve(PROJECT_DIR, './src/vendor/polyfill.js'),
    path.resolve(PROJECT_DIR, './src/index.js'),
  ],
  resolve: {
    alias: {
      'antd-demo': path.resolve(ROOT_DIR, './antd-demo/src'),
    },
    extensions: ['', '.js', '.jsx'],
    root: [
      path.resolve(NODEMODULES_PATH),
    ],
    modulesDirectories: [],
  },
  output: {
    path: path.resolve(PROJECT_DIR, './dist'),
    filename: 'bundle.js',
    publicPath: ADDRESS,
    pathinfo: true,
  },
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        include: /(antd-demo)/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.jsx?$/,
        include: /src/,
        loader: 'babel?cacheDirectory',
      }, {
        test: /\.css$/,
        loader: 'style!css?sourceMap',
      }, {
        test: /\.less$/,
        loader: 'style!css?sourceMap!less?sourceMap',
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
  },
  plugins: [
    new webpack.HotModuleReplacementPlugin(),
    new webpack.NoErrorsPlugin(),
    new webpack.optimize.DedupePlugin(),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('development'),
      },
    }),
    new webpack.DllReferencePlugin({
      context: '.',
      manifest: require('./dll/dev-manifest.json'),
    }),
    new webpack.ProgressPlugin(function handler(percentage, msg) {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`${Math.floor(percentage * 100)}% ${msg}`);
      if (percentage === 1) {
        process.stdout.clearLine();
      }
    }),
  ],
  cache: true,
  debug: true,
  devtool: 'eval',
  devServer: Object.assign(
    {
      publicPath: ADDRESS,
    },
    serverConfig
  ),
};
