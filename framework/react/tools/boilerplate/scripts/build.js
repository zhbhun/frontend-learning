const paths = require('../webpack/paths');
const runBuild = require('../webpack/runBuild');

runBuild(paths, {
  dependencies: ['base', 'react'],
  base: Infinity,
  react: [
    'react',
    'react-dom',
    'react-redux',
    'react-router',
    'react-router-redux',
    'redux',
    'redux-thunk',
  ],
});
