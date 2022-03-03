const path = require('path');
const fs = require('fs');
const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const InterpolateHtmlPlugin = require('react-dev-utils/InterpolateHtmlPlugin');
const WatchMissingNodeModulesPlugin = require('react-dev-utils/WatchMissingNodeModulesPlugin');
const getClientEnvironment = require('./env');
const defaultPaths = require('./paths');

// Get environment variables to inject into our app.
const defaultEnv = getClientEnvironment();

const entry = 'dll';

/**
 * Webpack Dll 配置生成器
 *
 * @param {object}  params
 * @param {object}  params.paths
 * @param {object}  params.env
 * @param {object}  params.config
 * @param {bollean} development
 * @param {array}   dependencies
 */
function WebpackDllConfigFactory(params = {}) {
  const paths = Object.assign({}, defaultPaths, params.paths);
  const env = Object.assign({}, defaultEnv, params.env);
  const dependencies = params.dependencies || [];
  let {
    output = {},
    resolve = {},
    module = {},
    plugins = [],
    ...config,
  } =  params.config || {};

  // This is the development configuration.
  // It is focused on developer experience and fast rebuilds.
  // The production configuration is different and lives in a separate file.
  return {
    cache: true,

    debug: true,

    // 提供 source-map，以便调试代码
    devtool: 'source-map',

    // These are the "entry points" to our application.
    // This means they will be the "root" imports that are included in JS bundle.
    entry: {
      [entry]: dependencies,
    },

    output: {
      // Next line is not used in dev but WebpackDevServer crashes without it:
      path: paths.appPrebuild,
      // Add /* filename */ comments to generated require()s in the output.
      pathinfo: true,
      // This does not produce a real file. It's just the virtual path that is
      // served by WebpackDevServer in development. This is the JS bundle
      // containing code from all our entry points, and the Webpack runtime.
      filename: '[name].js',
      library: '[name]_library',
      ...output,
    },

    resolve: {
      alias: {
        '~': paths.appSrc,
      },
      // These are the reasonable defaults supported by the Node ecosystem.
      // We also include JSX as a common component filename extension to support
      // some tools, although we do not recommend using it, see:
      // https://github.com/facebookincubator/create-react-app/issues/290
      extensions: ['.js', '.json', '.jsx', ''],
      // This allows you to set a fallback for where Webpack should look for modules.
      // We read `NODE_PATH` environment variable in `paths.js` and pass paths here.
      // We use `fallback` instead of `root` because we want `node_modules` to "win"
      // if there any conflicts. This matches Node resolution mechanism.
      // https://github.com/facebookincubator/create-react-app/issues/253
      fallback: paths.nodePaths,
      modulesDirectories: [],
      root: [
        paths.appNodeModules,
      ],
      ...resolve,
    },

    module: {
      loaders: [
        // Default loader: load all assets that are not handled
        // by other loaders with the url loader.
        // Note: This list needs to be updated with every change of extensions
        // the other loaders match.
        // E.g., when adding a loader for a new supported file extension,
        // we need to add the supported extension to this loader too.
        // Add one new line in `exclude` for each loader.
        //
        // "file" loader makes sure those assets get served by WebpackDevServer.
        // When you `import` an asset, you get its (virtual) filename.
        // In production, they would get copied to the `build` folder.
        // "url" loader works like "file" loader except that it embeds assets
        // smaller than specified limit in bytes as data URLs to avoid requests.
        // A missing `test` is equivalent to a match.
        {
          exclude: [
            /\.html$/,
            /\.(js|jsx)$/,
            /\.css$/,
            /\.json$/,
            /\.svg$/,
          ],
          loader: 'url',
          query: {
            limit: 10000,
            name: 'media/[name].[hash:8].[ext]',
          },
        },
        // Process JS with Babel.
        {
          test: /\.(js|jsx)$/,
          include: paths.appSrc,
          loader: 'babel',
          query: {
            // This is a feature of `babel-loader` for webpack (not Babel itself).
            // It enables caching results in ./node_modules/.cache/babel-loader/
            // directory for faster rebuilds.
            cacheDirectory: true,
          }
        },
        // "postcss" loader applies autoprefixer to our CSS.
        // "css" loader resolves paths in CSS and adds assets as dependencies.
        // "style" loader turns CSS into JS modules that inject <style> tags.
        // In production, we use a plugin to extract that CSS to a file, but
        // in development "style" loader enables hot editing of CSS.
        {
          test: /\.css$/,
          loader: 'style!css?importLoaders=1!postcss',
        },
        {
          test: /\.less/,
          loader: 'style!css?importLoaders=1!postcss!less',
        },
        // JSON is not enabled by default in Webpack but both Node and Browserify
        // allow it implicitly so we also enable it.
        {
          test: /\.json$/,
          loader: 'json',
        },
        // "file" loader for svg
        {
          test: /\.svg$/,
          loader: 'file',
          query: {
            name: 'media/[name].[hash:8].[ext]',
          },
        },
        ...(module.loaders || [])
      ],
    },

    // We use PostCSS for autoprefixing only.
    postcss: function() {
      return [
        autoprefixer({
          browsers: [
            '>1%',
            'last 4 versions',
            'Firefox ESR',
            'not ie < 9', // React doesn't support IE8 anyway
          ],
        }),
      ];
    },
    plugins: [
      new webpack.NoErrorsPlugin(),
      new webpack.optimize.OccurrenceOrderPlugin(true),
      new webpack.optimize.DedupePlugin(),
      new webpack.DllPlugin({
        path: path.resolve(paths.appPrebuild, '[name].json'),
        name: '[name]_library',
      }),
      ...plugins,
    ],
    // Some libraries import Node modules but don't use them in the browser.
    // Tell Webpack to provide empty mocks for them so importing them works.
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty'
    },
    ...config,
  };
}

WebpackDllConfigFactory.entry = entry;

module.exports = WebpackDllConfigFactory;
