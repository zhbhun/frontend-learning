const babel = require('@babel/core');

const source = 'const template = `${a}b${c}`';
const code = babel.transform(source, {
  presets: [
    ['@babel/preset-env', { targets: 'iOS >= 8', useBuiltIns: 'usage' }]
  ]
}).code;
console.log(code);
