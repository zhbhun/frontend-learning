const path = require('path');
const express = require('express');
const webpack = require('webpack');
const { host, port } = require('./constants');
const config = require('./webpack.dev.config');

const app = express();
const compiler = webpack(config);

app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}));

app.use(require('webpack-hot-middleware')(compiler));

app.listen(port, host, function(err) {
  if (err) {
    console.log(err);
    return;
  }
  console.log(`Listening at http://${host}:${port}`);
});
