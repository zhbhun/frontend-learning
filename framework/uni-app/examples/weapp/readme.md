### 前言
vant weapp是一套优秀的微信小程序组件，其基于微信的自定义组件原理实现。无法在H5及其他小程序平台运行。

由于uni-app的app侧也实现了一套微信小程序引擎，所以可以兼容运行vant weapp。

但uni-app的app端使用的是手机的webview而不是腾讯的X5浏览器内核，所以在低端的Android4、5手机上可能存在css兼容性问题，如遇到样式变形需修改源码中的样式。

### 使用建议
- 一般情况下，建议开发者使用标准的uni-app组件，即vue标准组件。
- 除非确定只做微信小程序，否则不建议整体项目依赖在vant weapp上。

### 示例介绍
本示例同时也是一个微信小程序转uni-app的示例。因为本示例原本是从vant官方发布的[微信演示示例](https://github.com/youzan/vant-weapp/tree/dev/example)转换而来。

所以每个页面里除了有vue页面，也保留了之前的wxml等文件，方便开发者看之前的小程序代码是怎么写的。

vant weapp的框架源码，都在工程的wxcomponents目录下。pages目录下是各个示例页面。

uni-app中使用微信小程序详细教程见：[https://uniapp.dcloud.io/frame?id=%e5%b0%8f%e7%a8%8b%e5%ba%8f%e7%bb%84%e4%bb%b6%e6%94%af%e6%8c%81](https://uniapp.dcloud.io/frame?id=%e5%b0%8f%e7%a8%8b%e5%ba%8f%e7%bb%84%e4%bb%b6%e6%94%af%e6%8c%81)

每个组件的使用方法，可以看示例页面的写法，api手册可参考[vant官网](https://youzan.github.io/vant-weapp)

### 环境注意
本示例部分功能依赖HBuilderX 1.8.8版及以上版本。最新版HBuilderX在社区首页右侧可获取。