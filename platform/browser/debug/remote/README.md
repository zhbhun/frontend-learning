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

- 调试通断

    - usb
    - websocket

## 发展历程

1. alert/console
2. [weinre](https://people.apache.org/~pmuellr/weinre/docs/latest/Home.html)
3. USB 连接调试

    - iOS：Safari Web Inspector
    - android：Chrome Devtools

4. CDP 生态

    - iOS：ios-webkit-debug-proxy + remotedebug-ios-webkit-adapter
    - [chii](https://github.com/liriliri/chii) - Remote debugging tool like weinre, replacing web inspector with the latest chrome devtools frontend.

5. 未来：WIFI + CDP

## 参考文献

- [【总结】1532- Hybrid 远程调试的前世今生](https://mp.weixin.qq.com/s/wPDAn7DNJCjVtqyn4lKRbg)
- [Webkit 远程调试协议初探](https://developer.aliyun.com/article/88380)
- [hybrid 远程调试的前世今生](https://juejin.cn/post/7153247297789231112)
- [跨终端 Web 之 Hybrid App](https://www.infoq.cn/article/hybrid-app)
