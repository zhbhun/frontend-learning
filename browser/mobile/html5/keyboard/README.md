- Android：

    - `window` 触发 `reszie` 事件；
    - `documentElement` 高度都会被键盘压缩；

- iOS

    - `window` 不会触发 `reszie` 事件，但是高度会被键盘压缩，`window.innerHeight` 变小；
    - `documentElement` 高度都不会被键盘压缩，可在变小的 `window` 区域内滚动显示，并且会根据输入框位置来调整滚动高度；

参考测试用例 [height](./test/height.html)

# 常见问题
- iOS 是否可以模拟类似 Android 的键盘效果？

    暂无，iOS 无法获取 `documentElement` 父级容器的高度。

    参考示例 [ios-fixed-position](./issues/ios-fixed-position.html)

- Android 是否可以模拟类似 iOS 的键盘效果

    可以，在第一次渲染时固定 `body` 高度，然后键盘弹出时会压缩 `documentElement`。相当于使用固定高度的 `body` 模拟 ios 的 `documentElement`，被压缩的 `documentElement` 模拟 iOS 的 `documentElement` 父级容器。

    参考示例 [android-fixed-height](./issues/android-fixed-height.html)

备注：在遇到复杂布局的输入框遮挡问题，可以利用 `scrollIntoViewIfNeeded` 方法来解决。

# 实际应用
- 评论输入框
- 表单输入框

# 参考文献
- [移动Web开发系列——软键盘及常见问题](http://www.zuojj.com/archives/1564.html)
- [移动端软键盘弹出，挡住输入框](https://segmentfault.com/q/1010000004886868)
- [html5手机网页开发，中文输入法下软键盘遮挡输入框](http://www.jianshu.com/p/98a662d97580)
- [HTML5 - 虚拟键盘出现挡住输入框的解决办法](http://www.hangge.com/blog/cache/detail_1357.html)
- [【小贴士】虚拟键盘与fixed带给移动端的痛！](http://www.cnblogs.com/yexiaochai/p/3561939.html)
- [(2016-11-04完美解决)移动端iOS第三方输入法遮挡底部input及android键盘回落后留白问题](https://segmentfault.com/a/1190000006243816)
- [iOS下的 Fixed + Input 调用键盘的时候fixed无效问题解决方案](http://www.haorooms.com/post/ios_fixed_input)
- [IOS输入框固定](http://www.zhangyunling.com/579.html)
- [解决ios h5 input输入框被输入法弹出一块区域](http://blog.csdn.net/sinat_25926481/article/details/53840614)

# 常见问题
- [Web移动端Fixed布局的解决方案](http://efe.baidu.com/blog/mobile-fixed-layout/?utm_source=tuicool&utm_medium=referral)
- [解决IOS safari在input focus弹出输入法时不支持position fixed的问题](https://www.douban.com/note/341635041/)
- [iOS下Html页面中input获取焦点弹出键盘时挡住input解决方案—scrollIntoView()](http://www.cnblogs.com/wx1993/p/6059668.html)
- [移动端web页面使用position:fixed问题](http://www.cnblogs.com/xiaohui108/p/3522339.html)
- [Iphone中css的fixed属性遇到input输入框，弹出键盘之后，会不管用，最好的解决办法是什么？](https://www.zhihu.com/question/24571304)
- [IOS中弹出键盘后出现fixed失效现象的解决方案](https://segmentfault.com/a/1190000005370182#articleHeader2)
- https://www.douban.com/note/341635041/
- http://www.cnblogs.com/yexiaochai/p/3561939.html

---

- https://github.com/zvona/Servant.js
- https://github.com/cubiq/iscroll
