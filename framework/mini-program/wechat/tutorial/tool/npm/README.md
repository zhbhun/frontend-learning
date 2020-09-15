# NPM

## 使用

1. 项目本地设置开启“使用 npm 模块”；

    开发者工具=》详情=》本地设置=》使用 npm 模块

2. 在小程序根目录安装 npm 包；

    小程序根目录由 project.config.js 的 miniprogramRoot 定义，默认为 project.config.js 所在的目录。

3. 构建 npm

    开发者工具=》工具=》构建 npm

4. 使用 npm

    第三方模块

    ```js
    const myPackage = require('packageName')
    ```

    自定义组件

    ```json
    {
      "usingComponents": {
        "myPackage": "packageName",
        "package-other": "packageName/other"
      }
    }
    ```

## 发布

TODO

## 参考文献

- [npm 支持](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)
