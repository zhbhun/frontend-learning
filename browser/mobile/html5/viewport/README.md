# 原理
> 通俗的讲，移动设备上的viewport就是设备的屏幕上能用来显示我们的网页的那一块区域，在具体一点，就是浏览器上(也可能是一个app中的webview)用来显示网页的那部分区域，但viewport又不局限于浏览器可视区域的大小，它可能比浏览器的可视区域要大，也可能比浏览器的可视区域要小。在默认情况下，一般来讲，移动设备上的viewport都是要大于浏览器可视区域的，这是因为考虑到移动设备的分辨率相对于桌面电脑来说都比较小，所以为了能在移动设备上正常显示那些传统的为桌面浏览器设计的网站，移动设备上的浏览器都会把自己默认的viewport设为980px或1024px（也可能是其它值，这个是由设备自己决定的），但带来的后果就是浏览器会出现横向滚动条，因为浏览器可视区域的宽度是比这个默认的viewport的宽度要小的。下图列出了一些设备上浏览器的默认viewport的宽度。

| iPhone | iPad | Android | Chrome | Opera | IE |
| --- | --- | --- | --- | --- | --- |
| 980 | 980 | 980 | 980 | 980 | 1024 |

# 疑问
- 没有设置 viewport 时，移动端浏览器的文档元素大小？
- viewport 设置固定宽度时的效果？
- 移动浏览器缩放页面的实际原理？

# 参考文献
- [移动前端开发之viewport的深入理解](https://www.cnblogs.com/2050/p/3877280.html)
- [在移动浏览器中使用viewport元标签控制布局](https://developer.mozilla.org/zh-CN/docs/Mobile/Viewport_meta_tag)
- [利用css @viewport 做设备适配](http://www.tuicool.com/articles/Z7bQBr)
- [Viewport <META> element](https://drafts.csswg.org/css-device-adapt/#viewport-meta)
- [A tale of two viewports — part one](https://www.quirksmode.org/mobile/viewports.html)
- [A tale of two viewports — part two](https://www.quirksmode.org/mobile/viewports2.html)
- [Meta viewport](https://www.quirksmode.org/mobile/metaviewport/)
- [配置视口](https://developers.google.com/speed/docs/insights/ConfigureViewport)
- [Configuring the Viewport](https://developer.apple.com/library/content/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html)
- [A Pixel Identity Crisis](https://alistapart.com/article/a-pixel-identity-crisis/)
- [Creating a Mobile-First Responsive Web Design](https://www.html5rocks.com/en/mobile/responsivedesign/)
- [Get viewport/window size (width and height) with javascript](https://andylangton.co.uk/blog/development/get-viewportwindow-size-width-and-height-javascript)

---

- [iPhone X的缺口和CSS](http://web.jobbole.com/92448/)
- [Detect if the device is iPhone X](https://stackoverflow.com/questions/46192280/detect-if-the-device-is-iphone-x)
- [iPhone X 适配手Q H5 页面通用解决方案](https://cloud.tencent.com/community/article/686372)
- [Understanding the WebView Viewport in iOS 11](https://ayogo.com/blog/ios11-viewport/)
- https://www.paintcodeapp.com/news/ultimate-guide-to-iphone-resolutions
- [Difference between visual viewport and layout viewport?](https://stackoverflow.com/questions/6333927/difference-between-visual-viewport-and-layout-viewport)
- [A tale of two viewports — part two](https://www.quirksmode.org/mobile/viewports2.html)
- [viewports剖析](http://www.w3cplus.com/css/viewports.html)
- [走向视网膜（Retina）的Web时代](http://www.w3cplus.com/css/towards-retina-web.html)
- http://wileam.com/iphone-6-screen-cn/
- https://www.zhangxinxu.com/wordpress/2012/08/window-devicepixelratio/
- [从1px像素问题剖析像素及viewport](https://zhuanlan.zhihu.com/p/30640770)
- - [iPhone 6 屏幕揭秘](http://wileam.com/iphone-6-screen-cn/) / [iPhone 6 Screens Demystified](https://www.paintcodeapp.com/news/iphone-6-screens-demystified) / [iphone6屏幕揭秘](http://code.wileam.com/iphone-6-screen/)
