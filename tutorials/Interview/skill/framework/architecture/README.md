架构
========

## 前端发展史

- 2009

    - 规范

        - HTML5
        - ECMAScript5.0

    - 框架

        > JavaScript 类库已经颇为成熟，jQuery/Prototype/Script.aculo.us/Dojo 等都已经发布了好几个 stable 版本，各大类库也是相互吸收优点，不断完善并提高自身性能，然而功能上已经没有太多增加的势头。部分框架开始了思想上的转变，更加注重前端开发的组织和结构，条理性强了很多，如 YUI，Dojo 等。

    - 浏览器

        > 浏览器引擎大战，各大厂商也趁机瓜分 IE6 份额，Chrome 和 Firefox 在这场战役中取得小胜，V8 也敲响了前端的大门。为了迎合市场的激烈竞争，IE 开始了升级之旅，09 年初发布 IE8，全面兼容 CSS2.1。

    - Node.js
    - 3G Mobile

- 2010

    - 规范

        > 延续着 09 年的变化，10 年的前端显得颇为沉寂

    - 框架

        > 富客户端应用也在这一年蓬勃生长，ExtJS/Dojo 摇身变为企业级框架，各类组件化概念和产品如约而至。

    - 浏览器

        > IE 9 出来了预览第三版，iPhone 的 Safari 已经能够支持众多 HTML5 内容：Canvas/Video/Audio/Geolocation/Storage/Application Cache/Web SQL Database 等。

- 2011

    - 标准

        - HTML5

            > HTML5 的技术发展和推广都向前迈进了一大步，语义明确的标签体系、简洁明了的富媒体支持、本地数据的储存技术、canvas 等等各类技术被广泛应用。
        
        - Flash
        
            > 从 Flash Player 11.1 开始，Adobe 不再继续开发面向移动设备浏览器的 Flash 插件，积极投身于 HTML5，这意味着 Flash 技术的凋零。

    - 框架


        > HTML5 游戏火爆到了一个高潮，他的低门槛和高收益让很多开发者眼红，正因如此，移动端开发工具和调试工具也日益成熟。jQuery 已经成为大小公司日常开发的标配，成千上万的 JQ 插件让网页开发变得尤为轻松，而随之而来的也是页面的臃肿和性能调优的深入探索。

    - Node.js

        > Node.js 已经悄然崛起，在 github 上的访问量已经超过了 Rails，国内的云应用开始尝试使用 Node.js，Node.js 相关工具也纷纷出来。

- 2012

    - 规范

        > 在前端工程化上，几个派系相互争斗，产出了 AMD、CMD、KMD 等规范，也衍生了 SeaJS、RequireJS 等模块化工具。前端在这一年很有跳跃感。
        
    - 框架

        > Sencha Touch，Zepto.js，JQ Mobile，Bootstrap

    - 语言： CoffeeScript 和 TypeScript
    - Node.js

        > 在命令行领域开拓了一片不小的疆域，甚至有动摇 Perl 和 Ruby 地位的趋势。

- 2013

    - 规范

        - Web Components 的出现给前端开发开辟了新思路
        - WebDriver 规范的出来推动了自动化测试的进程
        - ECMAScript 6 的规范草案落地

    - 浏览器

        - Chrome

            > 开始支持 SPDY，使用 Blink 取代 webkit 作为 Chromium 的新渲染引擎，Chrome DevTools 的调试体验大幅度提升。这一年中，Chrome 连同其他浏览器厂商快速推动了各项草案规范的实现。

    - 语言

        > 语言能力上依旧在增强，并且从 JS 开始扩散到 CSS，出现了 LESS、SASS 和 Stylus 等预处理语言，Web 开发变得更加紧凑。

    - 框架

        > 而在无线端，应用不再局限于 Webapp，由于流畅度、性能等方面不能满足用户体验的需求，各大公司开始转向 Native 方向的研究，进而出现了 Hybrid 和 PhoneGap 的繁荣，它们为 JS 调用了提供更多的设备 API。

    - Node.js

        > Node.js 大放异彩，很多公司在生产环境中使用 Node.js，同时也出现了诸如 Express、Meteor 等小巧的快速搭建 Node.js Server 的应用框架。

    - 工程化

        > 各浏览器的调试也是种类繁多、功能丰富，PhantomJS 在自动化测试上开始取代 Selenium，出现了众多的远程调试方案和工具。

        > 前端工程化开始普及，各公司开始推出自己的前端集成开发解决方案。

    - [2013 前端技术盘点](http://blog.jobbole.com/54459/)

- 2014

    - 标准

        > HTML5 正式定稿，这意味着，web page 正式演变为 web application。ES6 华丽丽走进前端，走的很稳重，它的 Module/Class 等特性已经完全让这们语言具备了开发大型应用的能力。

    - 框架

        > 　大而厚的基础库难以满足灵活场景，Mobile 要求极致体验，MV* 库铺卷而来，如 avalon/angular/knockout 等。

    - Node.js

        > Node.js 前后端分离的流行，中间层的出现改变了前后端的合作模式。

    - [2014 年末有哪些比较火的 Web 开发技术？](https://www.zhihu.com/question/26644904/answer/33634518)

- 2015

    - 框架

        > Facebook 在 React.js Conf 2015 大会上推出了基于 JavaScript 的开源框架 React Native，它结合了 Web 应用和 Native 应用的优势，可以使用 JavaScript 来开发 iOS 和 Android 原生应用。在 JavaScript 中用 React 抽象操作系统原生的 UI 组件，代替 DOM 元素来渲染等。敲一次代码，能够运行在多个平台上，其优势可见一斑。除了 React ，还有手机淘宝推出的 Weex 框架，它吸收了 vue.js 的编程精华，编程风格更加简约。

    - 工具

        > 众多构建工具中，如今潇洒存活的并不多。体验完 grunt 和 browserify 后，gulp 顺势而至，尔后又出现了 webpack、jspm 等。而包管理工具，经历了 components、bower、spm 后，npm 开始主导整个市场。

    - Node.js

        > Node.js 的应用已经铺天盖地，各大公司前端都把 Node.js 作为分离前后端的主要手段，并且在测试、监控等方面沉淀了大量内容。不过，这个市场是很苛刻的，Node.js 的性能难以达到 C/C++ 的水平，那么接下来要做的就是要提升性能，至少得接近 C/C++。

    - [2015前端框架何去何从](http://www.cnblogs.com/sskyy/p/4264371.html)
    - [2015前端组件化框架之路](https://github.com/xufei/blog/issues/19)
    - [The State of Front-End Tooling – 2015](https://ashleynolan.co.uk/blog/frontend-tooling-survey-2015-results)

- [这些年，web前端都经历了什么](这些年，web前端都经历了什么)
- [从前端到全端：JavaScript逆袭之路](https://techblog.toutiao.com/2018/05/25/cong-qian-duan-dao-quan-duan-javascriptni-xi-zhi-lu/)
- [360前端大神“十年踪迹”：写给想成为前端工程师的你](https://zhuanlan.zhihu.com/p/28354908)

## 技术选型

### react 的优缺点？

我一直陷入到对比 vue 上了，要说 react 吸引我的点主要有

1. 组件式的开发模式，在我刚进美柚的时候前端在使用 angular1，而且代码组织结构还是传统的 MVC 模式。对于体验过 react 组件式开发方式的我来说，每天维护同一个功能要在 view ，Controls，style 各个文件夹里切换是异常痛苦的。为此参照 react 的组件开发方式来组织项目代码，很大提高了项目的开发体验；
2. JSX ，在 react 刚出来的时候很多人吐槽混合样式，模板和脚本的写法，但写习惯后才觉得这才是最佳实践，配合成熟完善的开发工具开发效率也有所提高；
3. 单向数据流，围绕状态管理的开发方式，以及虚拟 DOM，在兼顾性能的同时屏蔽了 DOM 操作；
4. 配套的开发工具，react dev tool，以及 Dan Abramov 开发的热加载，redux 调试工具等（对比 angular.js 真的是秒杀）
4. flux，redux 框架，虽然 redux 原生的写法太多模板代码，但真是 redux 的简单和可扩张性，给开源社区带来了很多优秀的开源库：dva，redux-saga等等。
5. react 的 "Learn Once, Write Anywhere"，react 只是一层简单的组件 API，针对不同平台提供了不同的实现，dom 有 react-dom，服务端渲染有 react-dom/server，混合应用有 react-native，canvas 有 react-canvas，react-pixi。甚至还有针对 
PC 和 Mac 的原生应用的封装实现。
6. React 在 CSS IN JS 方面有很多优秀的开源项目和工具，解决了　CSS 样式名冲突等问题。
7. React 版本升级的友好。

react 存在的一些问题

1. 开发动画不够友好，有时候思路比较绕，但开源的也有挺多的解决方案，有类似 RN 的 animated 库的解决方案，还有很多其他优秀的开源库，目前用的不是很多
2. react 需要编译和构建工具，早期没有方便的脚手架工具，webpack 配置又难，对于新手很不友好。不管现在 ES 和 TS 盛行，webpack，babel的工具也变得越来越容易配置。
3. react 只是一个 view 层，需要实际应用的项目中，还需要结合状态管理框架。

### 为什么选择 React？

1. 单纯从技术上来说，上面回答了我认为的 React 存在的优缺点，对于有写缺点目前社区也有有些的解决方案，而 react 上手难现在已经不是什么问题。反而，我庆幸伴随着 react 生态的发展，学习了很多东西。我目前只对 react 比较熟悉，vue 和 Angular2+ 只是处于了解，在有新项目的时候我都会优先考虑　react。
2. 从公司业务上来说，我觉得目前各大框架都很完善，都遵循 MIT 协议可以放心地免费使用。另外我在美柚产品技术部主要采用 react 技术栈，主要是移动端当时需要发展 RN 技术时团队都对 React　技术栈更加熟悉，后续技术选型的时候也就更优先考虑 react。

## 前端监控？

目前公司实际上是有做一些监控日志的，自己也曾利用对应的监控平台排查过问题

1. RN：有做首屏事件的统计，对于一些严重的错误导致的闪退会上报给腾讯的 bugly，这个主要原生实现的。
2. H5：如果是 NodeJS 服务端渲染，基本是服务端打错误日志，然后运维那边搭建了 Elasticsearch，通过 Kibana 分析日志页面加载的服务端问题（之前通过这个平台解决了几个难复现的 bug）。对于 SPA 等纯前端的渲染以及其他前端错误导致页面不渲染和不响应的问题，目前还没有实现监控，我想主要思路也就是监听错误事件，然后上报个日志服务器。

## 参考文献

- [美团点评前端技术体系的思考与实践](https://en.100offer.com/blog/posts/286)
