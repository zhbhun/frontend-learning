module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        "targets": {
          "browsers": "Chrome >= 30"
        },
        spec: false,
        loose: false,
        useBuiltIns: 'usage',
        corejs: 3,
      },
    ],
  ],
  plugins: [
    [
      '@babel/plugin-transform-runtime',
      {
        corejs: false,
        helpers: true,
        regenerator: true,
        useESModules: false,
      },
    ],
  ],
  sourceType: 'unambiguous',
};
