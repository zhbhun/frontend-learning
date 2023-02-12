# Web 应用

## 缺点

- [BlendUI，让 webapp 的体验和交互得到质的提升](https://www.infoq.cn/article/blendul-improve-webapp-experience-and-interactive)

    > 前些年，在做移动 web 站点时，我们都会追求一些无刷新的跳转、换页效果，但后来发现这样做在市场顶级的手机上尚不能运行流畅，就更不用说那些相对廉价和低端的智能机了。所以近一年来，大家倾向于不在移动 web 站点中采用复杂的特效，只在最关键的部分，用最小的代价来实现。

    > 经过对 6000+ 开发者的调查，他们发现，46% 的开发者认为性能是影响他们选择的因素，这也是在所有因素中占比最高的，其次是API 的缺乏，占 37%，再次是与 Native 元素的整合，占 29%。这和做为移动开发者的我们的主观感受相当一致，性能是 Webapp 的巨大瓶颈，不流畅的 app 一定不受用户喜欢；其次是一些功能无法用 web 实现，比如语音、定位等；再次，即使这些功能可以用 Native 原生代码实现，也无法将他们整合到 Webapp 中
    >
    > 而第二个问题是第一个问题的延展：抛开性能问题，webapp 的能力和 Native app 相比有多大差距呢？他们调研了 Google Play 中的 30339 个 app。如果只使用 HTML5 技术，能实现 37% 的 app，如果使用 Phonegap，能实现 49%，如果使用 Appcelerator，能实现 63%。这个结果让人觉得很乐观，只要我们能用一些技术，将设备的一些基础功能开放到 web 中，能大幅提高 webapp 的应用范围。
    > 
    > 与此同时，我们调研了百度内部的 16 款 webapp，希望了解做为国内一线厂商的工程师，他们认为 webapp 的瓶颈所在。结论出奇的简单和一致，有 87.5% 的工程师认为，在自己的业务场景中，转场和动画问题是最首要的问题。
    > 其实移动 web 站点经过这些年的发展（我在 2010 年就参与过百度内部移动前端基础库的研发工作），工程师和产品经理已经很清晰地认识到什么交互是 web 无法实现的，比如 3D 转屏，动态的卡片式操作，他们会灵活地调整产品设计，避免这些交互。
    > 所以，我们面临的首要目标是，如何能 webapp 的转场能像 Native 那般流畅。
    > 但有一点是无法避开的，那就是页面的转场动画。web 是基于链接构建的，从一个页面点击链接跳转到另一个页面，如果通过有刷新的打开方式，用户要面对一个空白的页面等待，如果通过无刷新的方式，用 Javascript 移入 DOM 节点，在 Demo 状态下能做得很好，但一旦产品化，就要冒着很高的性能风险：页面太大，可能转场不流畅甚至浏览器 crash；单个 webview 中 DOM 节点过多，同时还要保存多个场景的状态，会占用过多内存，在使用的过程中会变得越来越卡；更不用提那些低端机型和低端浏览器了……
    > 
    > 所以，我们面临的首要目标是，如何能 webapp 的转场能像 Native 那般流畅。

- [Hybrid sweet spot: Native navigation, web content](https://signalvnoise.com/posts/3743-hybrid-sweet-spot-native-navigation-web-content)
- [How Can HTML Compete with Native?](https://www.slideshare.net/andreasc/how-can-html-compete-with-native/5-HOW_CAN_HTML5_compete_with)
- [How can HTML5 compete with Native?](https://lists.w3.org/Archives/Public/public-web-mobile/2013Oct/0034.html)
- [What’s the Problem with Mobile HTML5?](https://www.infoq.com/news/2013/11/mobile-html5)
- [HTML5 vs Native - What are the tradeoffs?](https://www.developereconomics.com/html5-vs-native-what-are-the-tradeoffs)
- [HTML5 performance is fine, what we are missing is tools](https://www.developereconomics.com/html5-performance-fine-missing-tools)
- [HTML5 versus Native programming?](https://www.iotgadgets.com/2013/11/html5-versus-native-programming/)
- [HTML5 vs Native: The Debate is Over](https://www.mobilesmith.com/html5-vs-native-debate-is-over/)
- [Mobile developers agree: HTML5 and JavaScript apps fall short](https://searchmicroservices.techtarget.com/feature/Mobile-developers-agree-HTML5-and-JavaScript-apps-fall-short)
