process.env.NODE_ENV = 'development';

// Load environment variables from .env file. Suppress warnings using silent
// if this file is missing. dotenv will never modify any environment variables
// that have already been set.
// https://github.com/motdotla/dotenv
require('dotenv').config({ silent: true });

const path = require('path');
const chalk = require('chalk');
const clearConsole = require('react-dev-utils/clearConsole');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const AddAssetHtmlPlugin = require('add-asset-html-webpack-plugin');

const runPrebuild = require('./runPrebuild');
const setupCompiler = require('./setupCompiler');
const WebpackDevConfigFactory = require('./WebpackDevConfigFactory');

const isInteractive = process.stdout.isTTY;

function startServer(compiler, { config, host, port, protocol }) {
  const devServer = new WebpackDevServer(compiler, {
    // Enable gzip compression of generated files.
    compress: true,
    // Silence WebpackDevServer's own logs since they're generally not useful.
    // It will still show compile warnings and errors with this setting.
    clientLogLevel: 'none',

    // Enable special support for Hot Module Replacement
    // Page is no longer updated, but a "webpackHotUpdate" message is sent to the content
    // Use "webpack/hot/dev-server" as additional module in your entry point
    // Note: this does _not_ add the `HotModuleReplacementPlugin` like the CLI option does.
    hot: true,

    // Set this as true if you want to access dev server from arbitrary url.
    // This is handy if you are using a html5 router.
    historyApiFallback: true,

    // By default WebpackDevServer serves physical files from current directory
    // in addition to all the virtual build products that it serves from memory.
    // This is confusing because those files won’t automatically be available in
    // production build folder unless we copy them. However, copying the whole
    // project directory is dangerous because we may expose sensitive files.
    // Instead, we establish a convention that only files in `public` directory
    // get served. Our build script will copy `public` into the `build` folder.
    // In `index.html`, you can get URL of `public` folder with %PUBLIC_PATH%:
    // <link rel="shortcut icon" href="%PUBLIC_URL%/favicon.ico">
    // In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
    // Note that we only recommend to use `public` folder as an escape hatch
    // for files like `favicon.ico`, `manifest.json`, and libraries that are
    // for some reason broken when imported through Webpack. If you just want to
    // use an image, put it in `src` and `import` it from JavaScript instead.
    // contentBase: paths.appPublic,

    // Enable hot reloading server. It will provide /sockjs-node/ endpoint
    // for the WebpackDevServer client so it can learn when the files were
    // updated. The WebpackDevServer client is included as an entry point
    // in the Webpack development configuration. Note that only changes
    // to CSS are currently hot reloaded. JS changes will refresh the browser.
    // hot: true,

    // It is important to tell WebpackDevServer to use the same "root" path
    // as we specified in the config. In development, we always serve from /.
    publicPath: config.output.publicPath,

    // WebpackDevServer is noisy by default so we emit custom message instead
    // by listening to the compiler events with `compiler.plugin` calls above.
    quiet: true,

    // Reportedly, this avoids CPU overload on some systems.
    // https://github.com/facebookincubator/create-react-app/issues/293
    watchOptions: {
      ignored: /node_modules/
    },

    // Enable HTTPS if the HTTPS environment variable is set to 'true'
    // https: protocol === "https",

    stats: { colors: true },
  });

  // Launch WebpackDevServer.
  devServer.listen(port, host, (err, result) => {
    if (err) {
      return console.log(err);
    }

    if (isInteractive) {
      clearConsole();
    }
    console.log(chalk.cyan('Starting the development server...'));
    console.log();
  });
}

function addPrebuildCache(paths, name) {
  return [
    new AddAssetHtmlPlugin({
      filepath: path.resolve(paths.appPrebuild, `./${name}.js`),
      includeSourcemap: true,
      outputPath: 'js',
      publicPath: '/js',
      typeOfAsset: 'js',
    }),
    new webpack.DllReferencePlugin({
      context: paths.app,
      manifest: require(paths.appPrebuild + `/${name}.json`),
    }),
  ];
}

function runDevServer(paths, dependencies) {
  const packageDependencies = Object.keys(require(paths.appPackageJson).dependencies);
  runPrebuild(paths, dependencies.concat(packageDependencies), function callback(prebuild) {
    const protocol = process.env.HTTPS === 'true' ? "https" : "http";
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3000;
    const config = WebpackDevConfigFactory({
      paths,
      config: {
        plugins: [
          ...(addPrebuildCache(paths, prebuild)),
        ],
      },
    });
    const compiler = setupCompiler(config ,{ host, port, protocol });
    startServer(compiler, { config, host, port, protocol });
  });
}

module.exports = runDevServer;
