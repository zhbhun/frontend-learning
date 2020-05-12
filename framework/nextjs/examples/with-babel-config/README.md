测试如何编译第三方库。

## 用法

- `.babelrc`：用于项目代码的编译配置
- `babel.config.js`：用户 node_modules 下第三方库的编译配置
- `next.config.js`：需要调整 webpack babel-loader 的配置，将第三方库交给 babel 编译

## 示例

对比目标：下面这两个模块内的代码都使用了一些新的语法和 API，在 `npm install` 之后会自动拷贝 aaa 模块到 node_modules 目录下，然后与 bbb 模块对比编译输出结果。

测试结果：两者编译输出的结果一致，说明我们的配置生效了。

其他试验：尝试修改 `babel.config.js` 配置的编译目标，观察两个模块的变化情况。
