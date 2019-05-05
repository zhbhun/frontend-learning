const path = require('path');

const prodConfig = require('./dll.prod.config');

const PROJECT_DIR = path.resolve(__dirname, '../');

module.exports = Object.assign({}, prodConfig, {
  entry: {
    polyfill: [path.resolve(PROJECT_DIR, './src/vendor/polyfill.js')],
  },
});
