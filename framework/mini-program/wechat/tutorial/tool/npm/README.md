# NPM

## 基础

### 使用 npm 包

- [安装 npm 包](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html#%E4%BD%BF%E7%94%A8-npm-%E5%8C%85)

### 发布 npm 包

- 小程序 npm 包：package.json 有 miniprogram 指定的构建文件生成目录，通常是第三方自定义组件

    参考 [开发第三方自定义组件](https://developers.weixin.qq.com/miniprogram/dev/framework/custom-component/trdparty.html)

- 其他 npm 包：普通的 npm 包

    参考 [sm-crypto](https://github.com/wechat-miniprogram/sm-crypto)

参考文献

- [发布 npm 包](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html#%E5%8F%91%E5%B8%83-npm-%E5%8C%85)

## 进阶

### [工作原理](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html#%E5%8E%9F%E7%90%86%E4%BB%8B%E7%BB%8D)

1. 安装：使用 npm 命令安装依赖包
2. 构建：

    - 小程序 npm 包：直接拷贝 miniprogram 指定的构建文件到 miniprogram_npm 目录中
    - 其他 npm 包：入口 js 文件开始走一遍依赖分析和打包过程（类似 webpack）

3. 引用：寻找 npm 包的过程和 npm 的实现类似，从依赖 npm 包的文件所在目录开始逐层往外找，直到找到可用的 npm 包或是小程序根目录为止。

### [自定义 node_modules 和 miniprogram_npm 的位置](ttps://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html#%E8%87%AA%E5%AE%9A%E4%B9%89-node-modules-%E5%92%8C-miniprogram-npm-%E4%BD%8D%E7%BD%AE%E7%9A%84%E6%9E%84%E5%BB%BA-npm-%E6%96%B9%E5%BC%8F)

可以通过属性 packNpmManually 和 packNpmRelationList 在 project.config.json 中指定 node_modules 的位置 和目标 miniprogram_npm 的位置。

## 参考文献

- [npm 支持](https://developers.weixin.qq.com/miniprogram/dev/devtools/npm.html)
