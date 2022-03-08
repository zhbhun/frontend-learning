# Hermes

- 是什么：Facebook 在 **ChainReact 2019** 大会上正式推出了新一代 JavaScript 执行引擎 Hermes。Hermes 是个轻量级的 JS 引擎，专门对 Android 上运行ReactNative 进行了优化。
- 为什么：在分析性能数据时，Facebook 团队发现 JavaScript 引擎是**影响启动性能和应用包体积的重要因素**。由于 JavaScriptCore 最初是为桌面浏览器端设计，相较于桌面端，移动端能力有太多的限制，为了能从底层对移动端进行性能优化，Facebook 团队选择自建 JavaScrip 引擎，

    - 从页面启动到用户可操作的时间长短（Time To Interact：TTI），从 4.3s 减少到 2.01s
    - App的下载大小，从 41MB 减少到 22MB
    - 内存占用，从 185MB 减少到 136MB

- 怎么做：

    ```gradle
    // android/app/build.gradle
    project.ext.react = [
      entryFile: "index.js",
      - enableHermes: false  // clean and rebuild if changing
      + enableHermes: true  // clean and rebuild if changing
    ]
    ```

- 原理

    - 字节码预编译
    - 放弃 JIT

- 问题

    - 兼容性：限于 iOS AppStore 审核限制，目前仅用于 Android 平台。
    - bytecode 文件占用 size 过大问题：Hermes 编译的字节码文件比纯文本js文件增大 100%（可以将 bytecode 编译放在客户端中处理）。
    - 执行纯文本 js 耗时长：Hermes 加载纯文本的性能比 JavaScriptCore 要慢将近 30%。主要原因是 Hermes 删除 JIT 功能，致使对纯文本 JS 代码运行变慢。
    - 缓存问题：使用缓存的 JavaScriptCore 引擎，第二次打开页面的速度与打开纯 native 页面的速度几乎相当，并且表现相当稳定。而使用缓存的 Hermes 引擎加载业务代码表现非常一般，甚至某些情况下比第一次加载还要慢。

## 参考文献

- [What makes Hermes engine (React Native) fast?](https://medium.com/tilicholabs/what-makes-hermes-engine-react-native-fast-ac6fa5e3ad2e)
