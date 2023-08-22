# [yeoman](https://yeoman.iocd)

## Install

```shell
npm install -g yo
npm install -g generator-webapp
yo webapp
```

## Generator

### 创建项目

```shell
npm install -g yo generator-generator
yo generator
```

### 项目结构

```shell
.
├── generators/
│   └── app/
│       ├── index.js
│       └── templates/
│           └── dummyfile.txt
├── .editorconfig
├── .eslintignore
├── .gitattributes
├── .gitignore
├── .travis.yml
├── .yo-rc.json
├── LICENSE
├── README.md
├── package.json
└── __tests__/
    └── app.js
```

### 脚本

```js
var Generator = require('yeoman-generator');

module.exports = class extends Generator {};
```


### 任务

- 普通函数：作为任务脚本执行
- 工具函数：必须使用下划线作为前缀，否则会作为任务自动执行
- 生命周期：

    1. initializing
    2. prompting
    3. configuring
    4. default
    5. writing
    6. conflicts
    7. install
    8. end

### 交互

prompt

- input
- confirm

### 调试

```shell
npm link
yo ...
```
