const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, './index.js'),
  output: {
    filename: 'bundle.prod.js',
    path: path.resolve(__dirname, 'dist')
  },
  mode: 'production',
  optimization: {
    concatenateModules: false
  },
  devtool: false
};
