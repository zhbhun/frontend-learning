// webpack-dev-server --config ./webpack/dev.config.js --progress --host localhost --port 3000
// 命令行启动存在组件状态丢失的问题
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const config = require('./dev.config');
const serverConfig = require('./dev.server.config');

new WebpackDevServer(webpack(config),
  Object.assign(
    {
      publicPath: config.output.publicPath,
    },
    serverConfig,
  ),
).listen(3000, 'localhost', (err) => {
  if (err) {
    console.log(err);
    return;
  }
  // console.log('Listening at http://localhost:3000/');
});


/*
[ { state: true,
    stats:
     Stats {
       compilation: [Object],
       hash: '889e12f36f5890cffbec',
       startTime: 1479263811812,
       endTime: 1479263826339 },
    options:
     { publicPath: 'http://localhost:3000/',
       hot: true,
       historyApiFallback: true,
       noInfo: true,
       quiet: false,
       reporter: [Function: reporter],
       stats: [Object],
       watchOptions: [Object],
       log: [Function: bound bound ],
       warn: [Function: bound bound ] } } ]

// ---

Listening at http://localhost:3000/
Hash: cb4487ac2a7850353bfe
Version: webpack 1.13.3
Time: 3874ms
                                   Asset      Size  Chunks       Chunk Names
                               bundle.js   4.26 MB       0       main
    0.889e12f36f5890cffbec.hot-update.js   7.72 kB       0       main
    889e12f36f5890cffbec.hot-update.json  36 bytes
                           bundle.js.map   4.87 MB       0       main
0.889e12f36f5890cffbec.hot-update.js.map   4.78 kB       0       main
chunk    {0} bundle.js, 0.889e12f36f5890cffbec.hot-update.js, bundle.js.map, 0.889e12f36f5890cffbec.hot-update.js.map (main) 3.89 MB [rendered]

*/
