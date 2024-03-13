const path = require('path');

const context = __dirname;

module.exports = {
  mode: 'development',
  entry: path.resolve(context, 'src/index.js'),
  devtool: false,
  output: {
    path: path.resolve(context, 'output')
  },
  module: {
    rules: [
      {
        test: /.js$/,
        include: /src/,
        use: ['babel-loader']
      }
    ]
  }
};
