- [Fixing 300ms click delay in React Application](https://moodysalem.com/2015/08/30/fastclick_in_react_application.html)
- [300ms tap delay, gone away](https://developers.google.com/web/updates/2013/12/300ms-tap-delay-gone-away)

---

- [也来说说touch事件与点击穿透问题](https://segmentfault.com/a/1190000003848737)
- [手持设备点击响应速度，鼠标事件与touch事件的那些事](http://www.cnblogs.com/yexiaochai/p/3377900.html)
- [【移动端兼容问题研究】javascript事件机制详解（涉及移动兼容）](http://www.cnblogs.com/yexiaochai/p/3462657.html)

---

- https://github.com/ftlabs/fastclick

---

- [iOS 上 Safari 的 touch 事件会穿透到其它 dom 元素，有什么规避的办法？](https://www.zhihu.com/question/20542144)
- [Pass mouse events through absolutely-positioned element](https://stackoverflow.com/questions/1009753/pass-mouse-events-through-absolutely-positioned-element)
- https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events

---

## 常见问题

### iOS11 应用切换前后台的时候出现页面卡主的问题

- 问题

    - [Regression(r222392?): Events can have a negative timestamp which causes app breakage](https://bugs.webkit.org/show_bug.cgi?id=185040)
    - [iOS 11.3 PhoneGap resume problem](http://forum.framework7.io/t/ios-11-3-phonegap-resume-problem/2912)
    - [Clicks stop working on iOS 11.3 after resuming](https://github.com/ftlabs/fastclick/issues/549)
    - [Repair IOS11.4 that can't be clicked and unable to scroll BUG](https://github.com/ftlabs/fastclick/issues/561)
    - [IOS 版本11.25 11.3 11.4下均有点不动滑不了的情况（偶现）](https://github.com/ftlabs/fastclick/issues/563)

- 解决

    - [Fix negative event.timeStamp values on iOS 11.3](https://github.com/ftlabs/fastclick/pull/550)
    - [Update fastclick.js for iOS/Safari timestamp bug](https://github.com/ftlabs/fastclick/pull/554)
    - [Try to fix negative event.timeStamp values on iOS 11.3/4](https://github.com/ftlabs/fastclick/pull/564)

---

- [2019 再聊移动端 300ms 延迟及 fastClick 原理解析](https://segmentfault.com/a/1190000019281808)
- [现在的wap项目还有必要引入fastclick吗?](https://www.zhihu.com/question/290218841)
- [mint-ui loadmore 上拉刷新的问题](https://github.com/ElemeFE/mint-ui/issues/120)
