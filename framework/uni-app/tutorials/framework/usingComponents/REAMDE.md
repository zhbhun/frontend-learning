# [小程序自定义组件](https://uniapp.dcloud.net.cn/frame?id=%e5%b0%8f%e7%a8%8b%e5%ba%8f%e8%87%aa%e5%ae%9a%e4%b9%89%e7%bb%84%e4%bb%b6%e6%94%af%e6%8c%81)

- [wxcomponents-template](https://github.com/dcloudio/uni-app/tree/master/examples/wxcomponents-template)
- [Vantui Weapp For Uni-app](https://ext.dcloud.net.cn/plugin?id=302)

## 问题

### 如何使用 node_modules 目录下的模块

uni-app usingComponents 只能指向 wxcomponents 目录下的自定义组件，编译构建时会把源码目录下的 wxcomponents 拷贝到 dist/dev|build/mp-weixin/wxcomponents 目录下。

那么要如何使用 node_module 下的模块呢？可以使用 [copy-webpack-plugin](https://github.com/webpack-contrib/copy-webpack-plugin)，完成自动拷贝。

## 实例

## 参考

- [微信小程序转换uni-app详细指南、小程序转uni-app转换器、wepy转uni-app](https://ask.dcloud.net.cn/article/35786)
