# 安全区域

1. webview 必须是全屏的
2. 设置 viewport-fit 为 cover
3. 通过 constant(safe-area-inset-top/left/right/bottom) 或 env( safe-area-inset-top/left/right/bottom) 处理安全区域

## 问题

### 兼容性问题

- Android 可能不支持 CSS 安全区域变量，这时候需要原生通过 JS Bridge 提供安全区域信息
- iOS 旧版本不支持 CSS 安全区域变量，可以固定设置状态栏高度为 20。



## 参考文献

- [移动端H5-iPhone安全距离适配](https://juejin.cn/post/7046269334259236901)
- [如何解决移动端的安全区域为0的问题](https://zhuanlan.zhihu.com/p/373745323)
