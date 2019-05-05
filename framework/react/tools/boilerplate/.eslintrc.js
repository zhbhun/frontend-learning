module.exports = {
  parserOptions: {
    ecmaVersion: 6,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
      impliedStrict: true,
      experimentalObjectRestSpread: true,
    },
  },
  parser: 'babel-eslint',
  env: {
    browser: true,
    node: true,
    commonjs: true,
    'shared-node-browser': true,
    es6: true,
    amd: true,
  },
  plugins: [
    'babel',
    'import',
    'jsx-a11y',
    'react',
  ],
  extends: 'eslint:recommended',
  rules: {
    // javascript
    'no-console': 0,
    'no-unused-vars': 0,
    // react
  },
};
