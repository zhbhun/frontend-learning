# 远程调试

## 实现原理

调试终端 + 调试协议 + 通信通道 + 调试目标/服务

- 调试终端：

    - Chrome Devtool
    - Safari Inspector

- 调试协议：

    - Chrome Devtools Protocol (CDP)
    - Safari Webkit Devtools Protocol
    - VSCode Debug Adapter Protocol

- 通信通道

    - usb
    - websocket

## 发展历程

1. alert
2. 远程模拟调试：[weinre](https://people.apache.org/~pmuellr/weinre/docs/latest/Home.html)

    能力有限，比如无法调试源码、监控所有请求

3. USB 连接调试

    - iOS：
    
        - Safari Web Inspector
        - ios-webkit-debug-proxy + remotedebug-ios-webkit-adapter

    - android：Chrome Devtools

    够实现完整的调试能力，但引入了 USB 作为调试通道，增加了远程调试成本，且不适用于跨地远程调试

4. 前端模拟调试：VConsole/Eruda
5. CDP 远程模拟调试：[chii](https://github.com/liriliri/chii) - Remote debugging tool like weinre, replacing web inspector with the latest chrome devtools frontend.

    于 2020.4 推出，对标 weinre 的能力，只是将 webkit protocol 改为 Chrome Devtools Protocol ，weinre 无法获取到的，chii 也无法获取，比如网络只能捕获 xhr。

6. 未来：WIFI + CDP

总结：

- 前端调试：alert =》 VConsole/Eruda
- 远程调试：

    - CDP 调试：USB =》 WIFI
    - 模拟调试：weinre =》wii

## 参考文献

- [【总结】1532- Hybrid 远程调试的前世今生](https://mp.weixin.qq.com/s/wPDAn7DNJCjVtqyn4lKRbg)
- [Webkit 远程调试协议初探](https://developer.aliyun.com/article/88380)
- [hybrid 远程调试的前世今生](https://juejin.cn/post/7153247297789231112)
- [跨终端 Web 之 Hybrid App](https://www.infoq.cn/article/hybrid-app)
