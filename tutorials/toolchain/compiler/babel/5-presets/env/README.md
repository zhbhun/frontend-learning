[preset-env](https://babeljs.io/docs/en/babel-preset-env)
========

`@babel/preset-env` 是一个智能预设，它使您可以使用最新的 JavaScript，而无需操心管理编译目标环境所需的语法转换（以及可选的浏览器 polyfill）。这都使您的生活更轻松，JavaScript包更小！

## 配置说明

- `targets`：目标环境，默认会转换 ECMAScript 2015+ 的代码。
- `modules`：模块语法，默认为 `auto`(TODO: 工作原理？)
- `useBuiltIns`：polyfills，默认未启用
- `corejs`：polyfills 使用的 core-js 版本，默认为 2
- `shippedProposals`：polyfill 是否支持还处于提案阶段特性

默认情况下 `@babel/preset-env` 会将 ECMAScript 2015+ 的代码语法编译为更低版本的代码，并且默认不会处理 polyfills。

```json
{
  "targets": {},
  "bugfixes": false,
  "spec": false,
  "loose": false,
  "modules": "auto",
  "debug": false,
  "include": [],
  "exclude": [],
  "useBuiltIns": false,
  "corejs": 2,
  "forceAllTransforms": false,
  "configPath": "`process.cwd()`",
  "ignoreBrowserslistConfig": false,
  "shippedProposals": false
}
```

### 目标环境

[./targets](./targets)

### 模块语法

[./moduels](./moduels)

### Polyfills

- [./useBuiltIns](./useBuiltIns)
- [./corejs](./corejs)
- [./proposals](./proposals)

## 实际应用

**目标环境 + Polyfills**

根据实际需求，Polyfills 有很多种配置方式。

### entry

```json
{
  "targets": {
    "node": 10,
    "browsers": "iOS >= 11"
  },
  "useBuiltIns": "entry",
  "corejs": 3
}
```

entry 需要配合 core-js 使用（@babel/polyfill 已经被废弃）。

### usage

```json
{
  "targets": {
    "node": 10,
    "browsers": "iOS >= 11"
  },
  "useBuiltIns": "usage",
  "corejs": 3
}
```

### Support Proposals

```json
{
  "targets": {
    "node": 10,
    "browsers": "iOS >= 11"
  },
  "useBuiltIns": "usage",
  "corejs": 3,
  "shippedProposals": true
}
```

### All Proposals

```json
{
  "targets": {
    "node": 10,
    "browsers": "iOS >= 11"
  },
  "useBuiltIns": "usage",
  "corejs": {
    "version": 3,
    "proposals": true
  }
}
```
