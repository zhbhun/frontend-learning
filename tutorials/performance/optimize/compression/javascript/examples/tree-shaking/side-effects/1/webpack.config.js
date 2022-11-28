const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './index.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'production',
  optimization: {
    minimize: false,
    concatenateModules: false,
    // usedExports: true
  },
  devtool: false
};
