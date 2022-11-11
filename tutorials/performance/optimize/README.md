# 性能优化

ps：本文在 [Front-End Performance Checklist](https://github.com/thedaviddias/Front-End-Performance-Checklist) 基础上完善和实践前端性能优化。

## 加载优化

- 技术选型

  离线包 > SSG > SSR > CSR

  ps：孤岛式架构

- 网络优化

  - HTTP1 > HTTP2
  - HTTP > RPC
  - HTTP Resource Hint

- 服务优化

  - CDN
  - 缓存
  - 管道流输出骨架屏

- 静态资源优化

  - HTML

    - DNS 预解析
    - TCP 预链接
    - 资源预加载

  - JavaScript

    - 通过 script module 来加载现代更小打包体积的 JS
    - script 标签设置 defer 和 async
    - 拆包优化：
    
      - Tree Shaking 剔除无关代码
      - 代码压缩混淆

    - 拆包优化：第三方库单独打包
    - 按需加载：路由动态分包

  - CSS

    - 关键路径 CSS
    - Inline CSS
    - 拆包按需加载

  - Image

    - 格式
    - 压缩
    - 响应式：分辨率、PPI
    - 懒加载
    - 渐进式

  - 图标

    - 使用雪碧图
    - 使用

  - Font

    - 优先使用 woff2
    - 设置字体加载 Swap
    - 按需提取字体文件

- 缓存优化

  - HTTP 缓存
  - Service Worker
  - 通过调整打包机制，提高缓存命中率

- 存在问题：

  - 移动端 SSR 无法获取客户端信息

    - 改用离线包
    - 客户端约定在 URL 上追加客户端信息
    - 服务端只渲染静态信息，动态信息交给客户端异步加载
    - 客户端接口数据预加载

  - ... 

参考文献

- [Fast load times](https://web.dev/fast/#i18n.paths.fast.topics.optimize_your_images)
- [Load Performance](https://developers.google.com/web/fundamentals/performance/get-started/)
- [Web Performance Best Practices](https://developers.google.com/speed/docs/best-practices/rules_intro)
- [Web Performance Tutorials](https://developers.google.com/speed/articles/)
- [Text Compression for Web Developers](https://www.html5rocks.com/en/tutorials/speed/txt-compression/)
- [Faster Websites: Crash Course on Web Performance](http://www.igvita.com/2013/01/15/faster-websites-crash-course-on-web-performance/)
- [Automating Performance Best Practices with PageSpeed](https://www.youtube.com/watch?v=uR5urTx8S4E)
- [Network Performance](https://www.html5rocks.com/en/features/performance#NetworkPerformance)
- [Page Weight Doesn't Matter](https://www.speedshop.co/2015/11/05/page-weight-doesnt-matter.html)
- [Optimizing Application Delivery](https://hpbn.co/optimizing-application-delivery/)
- [Ultimate Guide to Browser Hints: Preload, Prefetch, and Preconnect - MachMetrics Speed Blog](https://www.machmetrics.com/speed-blog/guide-to-browser-hints-preload-preconnect-prefetch/)
- [WWC22 - Qwik + Partytown: How to remove 99% of JavaScript from main thread](https://www.youtube.com/watch?v=0dC11DMR3fU&t=154s)
- [优化 Cumulative Layout Shift 累积布局偏移](https://web.dev/optimize-cls/?utm_source=lighthouse&utm_medium=devtools#images-without-dimensions)

分析工具

- [bundlesize](https://github.com/siddharthkp/bundlesize)
- [source-map-explorer](https://github.com/danvk/source-map-explorer)

### HTML

#### 压缩 HTML

- 做什么：HTML代码压缩，将注释、空格和新行从生产文件中删除。
- 为什么：删除所有不必要的空格、注释和中断行将减少HTML的大小，加快网站的页面加载时间，并显著减少用户的下载时间。
- 怎么做：大多数框架都有插件用来压缩网页的体积。你可以使用一组可以自动完成工作的 NPM 模块。

    - 在线工具：适合临时处理

        - [HTML Minifier - kangax](https://kangax.github.io/html-minifier/)
        - [HTML Minifier from Will Peavy](https://www.willpeavy.com/tools/minifier/)
        - [HTML Minifier from Minify Code](http://minifycode.com/html-minifier/)
        - [HTML Compressor](http://htmlcompressor.com/)

        ps：推荐使用 Kangax 开发的 HTML Minifier，可以实现更加智能的压缩，压缩对比可以参考 [Minification Comparison](https://github.com/kangax/html-minifier#minification-comparison)。

    - Webpack

        - [html-webpack-plugin minify](https://github.com/jantimon/html-webpack-plugin#options)：单页应用项目通常使用 html-webpack-plugin 来生成包含打包资源的 HTML 文件，这里建议在生产环境开启 minify
        - [html-minifier-webpack-plugin](https://www.npmjs.com/package/html-minifier-webpack-plugin)：使用
        - [html-minifier-loader](https://www.npmjs.com/package/html-minifier-loader)：模块引用了 HTML 模块时可以使用加载器 html-minifier-loader 来压缩 HTML 模板

- 参考文献

    - [Optimizing HTML](http://perfectionkills.com/optimizing-html/)
    - [Experimenting with HTML minifier](http://perfectionkills.com/experimenting-with-html-minifier)

#### 删除不必要的属性

- 做什么：像 `type="text/javascript"` or `type="text/css"` 这样的属性应该被移除。
- 为什么：类型属性不是必需的，因为 HTML5 把 `text/css` 和 `text/javascript` 作为默认值。没用的代码应在网站或应用程序中删除，因为它们会使网页体积增大。
- 怎么做：确保所有 `style` 和 `<script>` 标记都没有任何type属性。

    ps：使用上面提到的压缩工具 [HTML Minifier - kangax](https://kangax.github.io/html-minifier/) 可以自动删除不必要的属性。

- 参考文献

    - [The Script Tag](https://css-tricks.com/the-script-tag/)

#### 在 JavaScript 引用之前引用 CSS 标记

- 做什么：确保在使用 JavaScript 代码之前加载 CSS。
- 为什么：在引用 JavaScript 之前引用 CSS 可以实现更好地并行下载，从而加快浏览器的渲染速度。
- 怎么做：

    ```html
    <!-- 不推荐 -->
    <script src="jquery.js"></script>
    <script src="foo.js"></script>
    <link rel="stylesheet" href="foo.css"/>

    <!-- 推荐 -->
    <link rel="stylesheet" href="foo.css"/>
    <script src="jquery.js"></script>
    <script src="foo.js"></script>
    ```

    确保 `<link>` 和 `<style>` 始终位于 `<script>` 之前。

- 参考文献

    - [CSS and javascript order](https://varvy.com/pagespeed/style-script-order.html)

#### 最小化 iframe 的数量

仅在没有任何其他技术可行性时才使用 iframe，否则尽量避免使用 iframe。

#### DNS 预解析

一次 DNS 查询时间大概在 60-120ms 之间或者更长，提前解析网页中可能的网络连接域名。

```html
<meta http-equiv="x-dns-prefetch-control" content="on">
<link rel="dns-prefetch" href="//example.com/">
```

参考文献

- [Can I use... `dns-prefetch`](https://caniuse.com/#feat=link-rel-dns-prefetch)
- [X-DNS-Prefetch-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-DNS-Prefetch-Control)
- [DNS Prefetching](http://dev.chromium.org/developers/design-documents/dns-prefetching)
- [DNS Prefetching for Firefox](http://bitsup.blogspot.com/2008/11/dns-prefetching-for-firefox.html)
- [Prerender and prefetch support](https://docs.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/dev-guides/dn265039(v=vs.85))

### CSS

#### 压缩 CSS

- 做什么：所有 CSS 文件都需要被压缩，从生产文件中删除注释，空格和空行。
- 为什么：缩小 CSS 文件后，内容加载速度更快，并且将更少的数据发送到客户端，所以在生产中缩小 CSS 文件是非常重要，这对用户是有益的，就像任何企业想要降低带宽成本和降低资源。
- 怎么做：使用工具在构建或部署之前自动压缩文件。

    - [cssnano](https://cssnano.co/)：基于 PostCSS 生态系统的模块化压缩工具。
    - [CSS minifier from Minify Code](http://minifycode.com/css-minifier/)
    - [Online CSS Compressor](http://refresh-sf.com/)
    - [Preload: What Is It Good For?](https://www.smashingmagazine.com/2016/02/preload-what-is-it-good-for/)

#### 合并 CSS

- 做什么：CSS 文件合并（对于 HTTP/2 效果不是很大）。
- 为什么：如果你还在使用 HTTP/1，那么你就需要合并你的文件。不过在使用 HTTP/2 的情况下不用这样（效果待测试）。
- 怎么做：在构建或部署之前使用在线工具或者其他插件来合并文件。当然，要确保合并文件后项目可以正常运行。

#### 非阻塞

- 做什么：非关键的 CSS 文件需要非阻塞引入，以防止 DOM 花费更多时间才能渲染完成。
- 为什么：非关键的 CSS 文件会阻止页面加载并延迟页面呈现。使用了 preload，可以在浏览器开始显示页面内容之前加载 CSS 文件。
- 怎么做：需要添加 `rel` 属性并赋值 `preload`，并在 `<link>` 元素上添加 `as=“style”`。

    ```html
    <link rel="preload" href="global.min.css" as="style" onload="this.rel='stylesheet'">
    <noscript><link rel="stylesheet" href="global.min.css"></noscript>
    ```

    ps：一定要是非关键的 CSS 文件（即不是首屏页面的样式）才可以这么做。

- 参考文献：

    - [loadCSS by filament group](https://github.com/filamentgroup/loadCSS)
    - [Preload CSS - Not blocking CSS.html](https://gist.github.com/thedaviddias/c24763b82b9991e53928e66a0bafc9bf)
    - [Preloading content with rel="preload"](https://developer.mozilla.org/en-US/docs/Web/HTML/Preloading_content)
    - [移除会阻止内容呈现的 JavaScript](https://developers.google.com/speed/docs/insights/BlockingJS)

#### CSS 类名的长度

- 做什么：class 的长度会对 HTML 和 CSS 文件产生（轻微）影响。
- 为什么：更长的 CSS class 命名会导致 HTML 和 CSS 文件体积变得更大，如果使用BEM，在某些情况下可能会写出比所需要的类名更长的字符。
- 怎么做：使用 [CSS Module](https://github.com/css-modules/css-modules) 来动态生成 CSS class 名称，既可以避免 CSS 全局命名空间的命名冲突问题，又可以在生产环境给每个类名生成五六个字符的 hash 值，缩减了不少 CSS 文件体积。

#### 不用的 CSS

- 做什么：删除未使用的 CSS 选择器。
- 为什么：删除未使用的 CSS 选择器可以减小文件的大小，提高资源的加载速度。
- 怎么做：借助一些工具来检测没有使用到的 CSS

    - 在线工具

        - [UnCSS Online](https://uncss-online.com/)

    - 自动化工具

        - [PurifyCSS](https://github.com/purifycss/purifycss) | [purifycss-webpack](https://github.com/webpack-contrib/purifycss-webpack)
        - [purgecss](https://github.com/FullHuman/purgecss) | [purgecss-webpack-plugin](https://github.com/FullHuman/purgecss-webpack-plugin)

    - 调试工具

        - [Chrome DevTools Coverage](https://developers.google.com/web/updates/2017/04/devtools-release-notes#coverage)

            [chrome-coverage.jpg](./assets/chrome-coverage.jpg)


#### 关键 CSS

- 做什么：将页面渲染时必备的 CSS 通过 `<style></style>` 的方式内联到页面中（尽可能压缩后引用）。
- 为什么：内联关键CSS有助于加速网页的呈现，减少对服务器的请求数量。

    ps：百度，谷歌等网站的首页都是这么做的！

- 怎么做：使用在线工具或使用 Addy Osmani 开发的插件生成关键CSS。

    - [addyosmani/critical](https://github.com/addyosmani/critical)
    - [html-critical-webpack-plugin](https://github.com/anthonygore/html-critical-webpack-plugin)
    - [webpack-plugin-critical](https://github.com/nrwl/webpack-plugin-critical)

- 参考文献：

    - [Understanding Critical CSS](https://www.smashingmagazine.com/2015/08/understanding-critical-css/)
    - [Inlining critical CSS for better web performance | Go Make Things](https://gomakethings.com/inlining-critical-css-for-better-web-performance/)
    - [Critical Path CSS Generator](https://www.sitelocity.com/critical-path-css-generator)
    - [Reduce the size of the above-the-fold content](https://developers.google.com/speed/docs/insights/PrioritizeVisibleContent)

####  嵌入或内联 CSS

- 做什么：避免在 `<body>` 中使用嵌入或内联CSS
- 为什么：因为将内容与设计分开是一种很好的做法。它还可以提高代码的可维护性并使站点可访问性更强。对于性能来说，它只是减少了 HTML 页面的文件大小和加载时间。
- 怎么做：始终使用外部样式表或在中嵌入 CSS（并遵循其他 CSS 性能规则）。
- 参考文献：[Avoid Inline Styles for CSS Design](https://www.lifewire.com/avoid-inline-styles-for-css-3466846)

#### 分析样式表的复杂性

- 做什么：分析样式表有助于发现有问题的、冗余和重复的 CSS 选择器。
- 为什么：有时在 CSS 中会出现冗余或错误代码，分析 CSS 文件并删除这些复杂性的代码可以加速 CSS 文件的读取和加载。
- 怎么做：CSS 需要有编写规范，再通过 CSS 预处理器处理。

    - [TestMyCSS](http://www.testmycss.com/) / [analyze-css](https://github.com/macbre/analyze-css)：优化和检查 CSS 性能
    - [CSS Stats](https://cssstats.com/)
    - [ Project Wallace](https://www.projectwallace.com/)

### JavaScript

#### 压缩 JS

- 做什么：所有JavaScript文件都要被压缩，生产环境中删除注释、空格和空行。
- 为什么：删除所有不必要的空格、注释和空行将减少JavaScript文件的大小，并加快网站的页面加载时间，提升用户体验。
- 怎么做：建议使用下面的工具在构建或部署之前自动缩小文件。

    - [UglifyJS 3](https://www.npmjs.com/package/uglify-js) | [uglifyjs-webpack-plugin](https://github.com/webpack-contrib/uglifyjs-webpack-plugin)
    - [Online JavaScript Compressor](http://refresh-sf.com/)

- 参考文献：

    - [Short read: How is HTTP/2 different? Should we still minify and concatenate?](https://scaleyourcode.com/blog/article/28)

#### 不内嵌 JavaScript

- 做什么：避免在 body 中间嵌入多个 JavaScript 代码，将 JavaScript 代码重新集中到外部文件中，放在或页面末尾（之前）。
- 为什么：将 JavaScript 嵌入代码直接放在中可能会降低页面速度，因为它在构建 DOM 时会加载。最好的选择是使用 async 或 defer 的外部文件来避免阻塞 DOM 渲染。另一种选择是在 `<head>` 中放置一些脚本，这些脚本大多数时候是需要在 DOM 进入主处理之前加载的分析代码或小脚本。
- 怎么做：确保使用 `async` 或 `defer` 加载所有 JavaScript 文件，并准确地在中加载代码。
- 参考文献：[11 Tips to Optimize JavaScript And Improve Website Loading and Rendering Speeds](https://www.upwork.com/hiring/development/11-tips-to-optimize-javascript-and-improve-website-loading-speeds/)

#### 非阻塞 JavaScript

- 做什么：使用 defer 属性或使用 async 来异步加载 JavaScript 文件。
- 为什么：JavaScript 阻止 HTML 文档的正常解析，因此当解析器到达 `<script>` 标记时，它会停止解析并且执行脚本。如果您的脚本位于页面顶部，则强烈建议添加 `async` 和 `defer`，但如果在标记 `</body>` 之前加载，没有太大影响。但是，使用这些属性来避免性能问题是一种很好的做法。
- 怎么做：添加 `async`（如果脚本不依赖于其他脚本）或 `defer`（如果脚本依赖或依赖于异步脚本）作为 `script` 脚本标记的属性。如果有小脚本，可以在异步脚本上方使用内联脚本。
- 参考文献：

    - [Remove Render-Blocking JavaScript](https://developers.google.com/speed/docs/insights/BlockingJS)
    - [Defer loading JavaScript](https://varvy.com/pagespeed/defer-loading-javascript.html)

#### 优化和更新的 JS 库

- 做什么：保证项目中使用的所有 JavaScript 库都是有用到的(推荐使用原生 JS 的简单功能)并更新到最新版本
- 为什么：大多数情况下，新版本都带有优化和安全性修复，所以应该使用最优化的代码来优化项目。
- 怎么做：如果项目使用NPM管理依赖包，[npm-check](https://www.npmjs.com/package/npm-check) 是一个非常有用的库来升级/更新你的库。。
- 参考文献：

    - [You may not need jQuery](http://youmightnotneedjquery.com/)
    - [Vanilla JavaScript for building powerful web applications](https://plainjs.com/)

#### 检查依赖项大小限制

- 做什么：确保使用最优的外部库，大多数情况下，可以使用更轻的库来实现相同的功能。
- 为什么：你可能想使用 npm 中 745000 个包中的一个，但你需要选择最适合项目需求的包。例如，MomentJS 是一个很棒的库，但是你可能永远不会使用其中的很多方法，这就是为什么创建 Day.js 的原因。瞬间大小从 16.4kB 到 2kB。
- 怎么做：

    - 始终比较并选择最适合您需求的轻型库,可以使用 [npm trends](http://www.npmtrends.com/) 等工具来比较 NPM 包下载次数或 [Bundlephobia](https://bundlephobia.com/) 以了解依赖项的大小。

        - [Moment](https://bundlephobia.com/result?p=moment)
        - [date-fns vs dayjs vs luxon vs moment](https://www.npmtrends.com/date-fns-vs-dayjs-vs-luxon-vs-moment)
    
    - 使用自动化工具分析项目的依赖大小

        - [ai/size-limit: Prevent JS libraries bloat. If you accidentally add a massive dependency, Size Limit will throw an error.](https://github.com/ai/size-limit)

            [Size Limit: Make the Web lighter — Martian Chronicles, Evil Martians’ team blog](https://evilmartians.com/chronicles/size-limit-make-the-web-lighter)

        - [webpack-bundle-analyzer - npm](https://www.npmjs.com/package/webpack-bundle-analyzer)

#### Service Workers

- 做什么：在 PWA 中使用 Service Workers 来缓存数据或执行可能繁重的任务，而不影响应用程序的用户体验。
- 参考文献

    - [Service Workers: an Introduction](https://developers.google.com/web/fundamentals/primers/service-workers/)
    - [Measuring the Real-world Performance Impact of Service Workers](https://developers.google.com/web/showcase/2016/service-worker-perf)
    - [book What Are Service Workers and How They Help Improve Performance](https://www.keycdn.com/blog/service-workers/)
    - [book How does a service worker work? - YouTube](https://www.youtube.com/watch?v=__xAtWgfzvc)

#### 使用 tree shaking 技术减少 js 大小

- 做什么：通过构建工具分析 JavaScript 代码并移除生产环境中用不到的 js 模块或方法
- 参考文献：

    - [Reduce JavaScript Payloads with Tree Shaking](https://developers.google.com/web/fundamentals/performance/optimizing-javascript/tree-shaking/)

#### 使用 code splitting 分包加载 js

- 做什么：通过分包加载，减少首次加载所需时间
- 怎么做：

    - Vendor splitting：根据库文件拆分模块，例如 React 或 lodash 单独打包成一个文件
    - Entry point splitting：根据入口拆分模块，例如通过多页应用入口或者单页应用路由进行拆分
    - Dynamic splitting：根据动态加载拆分模块，使用动态加载语法 import() ，实现模块按需加载

### 字体

#### Webfont 格式

- 做什么：在你的网站或者应用使用 WOFF2 格式字体。
- 为什么：根据 Google 的说法，WOFF 2.0 Web 字体压缩格式平均比 WOFF 1.0 高 30％ 的增益。一个较好的做法是使用 WOFF 2.0 作为主要字体，WOFF 1.0 和 TTF 格式字体作为备选。

    ps：可以查看 [Boottrap](https://unpkg.com/bootstrap@3.4.1/dist/fonts/) 的字体大小作为参考。

- 怎么做：在购买新字体之前应先检查提供商是否提供了 WOFF2 格式。如果使用的是免费字体，则可以始终使用 [Font Squirrel](https://www.fontsquirrel.com) 生成所需格式的字体。
- 参考文献：

    - [WOFF 2.0 – Learn more about the next generation Web Font Format and convert TTF to WOFF2](https://gist.github.com/sergejmueller/cf6b4f2133bcb3e2f64a)
    - [Can I use... WOFF2](https://caniuse.com/#feat=woff2)
    - [IcoMoon App - Icon Font, SVG, PDF & PNG Generator](https://icomoon.io/app/)
    - [Using @font-face | CSS-Tricks](https://css-tricks.com/snippets/css/using-font-face/?ref=frontendchecklist)

#### 使用 preconnect 可以更快地加载字体

- 做什么：

    `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`

- 为什么：当你浏览网站时，设备需要获取网站所在的位置以及需要连接的服务器。浏览器必须连接 DNS 服务器并等待查找完成后再获取资源（字体，CSS文件...），prefetche 和 preconnect 允许浏览器在空闲时进行上面的操作，在真实请求时就不需要再花时间去做一系列动作。这带来了性能的提升，因为当浏览器使用字体信息解析 CSS 文件并切从服务器请求字体文件时，它已经预先解析了 DNS 信息并且在其连接池中准备好与服务器的开放连接。
- 参考文献：

    - [Faster Google Fonts with Preconnect - CDN Planet](https://www.cdnplanet.com/blog/faster-google-webfonts-preconnect/)
    - [Make Your Site Faster with Preconnect Hints | Viget](https://www.viget.com/articles/make-your-site-faster-with-preconnect-hints/)
    - [Ultimate Guide to Browser Hints: Preload, Prefetch, and Preconnect - MachMetrics Speed Blog](https://www.machmetrics.com/speed-blog/guide-to-browser-hints-preload-preconnect-prefetch/)
    - [A Comprehensive Guide to Font Loading Strategies—zachleat.com](https://www.zachleat.com/web/comprehensive-webfonts/#font-face)
    - [typekit/webfontloader: Web Font Loader gives you added control when using linked fonts via @font-face.](https://github.com/typekit/webfontloader)

### 图片

- [Image Compression for Web Developers](https://www.html5rocks.com/en/tutorials/speed/img-compression/)

#### 图像优化

- 做什么：在保证压缩后的图片符合产品要求的情况下将图像进行优化。
- 为什么：优化的图像在浏览器中加载速度更快，消耗的数据更少。
- 怎么做：

    - 尽可能尝试使用 CSS3 效果（而不是用小图像替代）；
    - 尽可能使用字体图标；
    - 使用 SVG；
    - 使用编译工具并指定 85 以下的级别压缩。

        - [TinyPNG – Compress PNG images intelligently](https://tinypng.com/)
        - [TinyJPG – Compress JPEG images intelligently](https://tinyjpg.com/)
        - [Kraken.io - Online Image Optimizer](https://kraken.io/web-interface)
        - [Compressor.io - optimize and compress JPEG photos and PNG images](https://compressor.io/compress)
        - [SVGOMG - Optimize SVG vector graphics files](https://jakearchibald.github.io/svgomg/)

    - 使用测试工具自动化分析网站图片

         - [Website Speed Test Image Analysis Tool](https://webspeedtest.cloudinary.com/)

- 参考文献

    - [Image Optimization | Web Fundamentals | Google Developers](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/image-optimization)
    - [Essential Image Optimization - An eBook by Addy Osmani](https://images.guide/)

#### 图像格式

- 做什么：适当选择图像格式。
- 为什么：确保图片不会减慢网站速度
- 怎么做：使用测试工具 [Lighthouse](https://developers.google.com/web/tools/lighthouse/) 或 [Website Speed Test Image Analysis Tool](https://webspeedtest.cloudinary.com/) 识别哪些图像可以使用下一代图片格式（如 WebP）。比较不同的格式，有时使用 PNG8 比 PNG16 好，有时候不是。
- 参考文献：

    - [Serve Images in Next-Gen Formats](https://developers.google.com/web/tools/lighthouse/audits/webp)
    - [What Is the Right Image Format for Your Website? — SitePoint](https://www.sitepoint.com/what-is-the-right-image-format-for-your-website/)
    - [PNG8 - The Clear Winner — SitePoint](https://www.sitepoint.com/png8-the-clear-winner/)
    - [8-bit vs 16-bit - What Color Depth You Should Use And Why It Matters - DIY Photography](https://www.diyphotography.net/8-bit-vs-16-bit-color-depth-use-matters/)
    - [Choosing the Best Image Format in 2019: WebP, SVG Vs. Everyone](https://spyrestudios.com/best-image-format-2019-webp-svg-vs-everyone/)
    - [When to Use JPG, PNG, GIF, SVG or WebP as Your Image Format](https://techstacker.com/gif-jpg-gif-svg-webp-which-one-to-use/ZAwv8mukZPYP2waYm)

#### 使用矢量图像 VS 栅格/位图

- 做什么：可以的话，推荐使用矢量图像而不是位图图像
- 为什么：矢量图像（SVG）往往比图像小，具有响应性和完美缩放功能。而且这些图像可以通过 CSS 进行动画和修改操作。
- 参考文献：

    - [Inline SVG vs Icon Fonts](https://css-tricks.com/icon-fonts-vs-svg/)
    - [Death to Icon Fonts](https://speakerdeck.com/ninjanails/death-to-icon-fonts)
    - [SVG vs Image, SVG vs Iconfont](https://aotu.io/notes/2018/11/23/SVG_vs_Image_vs_iconfont/index.html)
    - [为什么使用 SVG 可以提升网页性能和体验](https://hacpai.com/article/1464879728790)
    - [Web 设计新趋势: 使用 SVG 代替 Web Icon Font](https://io-meter.com/2014/07/20/replace-icon-fonts-with-svg/)
    - [为什么这些大公司没有将SVG图标应用在移动端？（非icon-font）](https://www.zhihu.com/question/26865508)
    - [基于svg-sprite的svg icon方案实践](http://tech.lede.com/2018/03/27/fe/svg-icon/)

#### 图像尺寸

- 做什么：如果已知最终渲染图像大小，请在上设置宽度和高度属性。
- 为什么：如果设置了高度和宽度，则在加载页面时会保留图像所需的空间。如果没有这些属性，浏览器就不知道图像的大小，也无法为其保留适当的空间，导致页面布局在加载期间发生变化。

#### 避免使用 Base64 图像

- 做什么：你可以将微小图像转换为base64，但实际上并不是最佳实践。
- 为什么：

    - [Base64 Encoding & Performance, Part 1 and 2 by Harry Roberts](https://csswizardry.com/2017/02/base64-encoding-and-performance/)
    - [A closer look at Base64 image performance – The Page Not Found Blog](http://www.andygup.net/a-closer-look-at-base64-image-performance/)
    - [When to base64 encode images (and when not to) | David Calhoun](https://www.davidbcalhoun.com/2011/when-to-base64-encode-images-and-when-not-to/)
    - [Base64 encoding images for faster pages | Performance and seo factors](https://varvy.com/pagespeed/base64-images.html)

#### 懒加载

- 做什么：图像懒加载
- 为什么：它能改善当前页面的响应时间，避免加载一些用户可能不需要或不必要的图像。
- 怎么做：

    - 使用 Lighthouse 可以识别当前屏幕外的图像数量；
    - 要确保图片懒加载时鼠标悬停或其他用户操作时显示的替代图像；
    - 可以使用以下图像懒加载的JavaScript插件。

        - [verlok/lazyload: Github](https://github.com/verlok/lazyload)
        - [Lazy Loading Images and Video](https://developers.google.com/web/fundamentals/performance/lazy-loading-guidance/images-and-video/)
        - [5 Brilliant Ways to Lazy Load Images For Faster Page Loads - Dynamic Drive Blog](http://blog.dynamicdrive.com/5-brilliant-ways-to-lazy-load-images-for-faster-page-loads/)

#### 响应式图像

- 做什么：确保提供接近设备显示尺寸的图像。
- 为什么：小型设备不需要比视口大的图像。建议在不同尺寸上使用一个图像的多个版本。
- 怎么做：为不同的设备设置不同大小的图像。 使用srcset和picture为每个图像提供多种变体（variants）。
- 参考文献：[ Responsive images - Learn web development | MDN](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)


### 服务端

#### 网站使用 HTTPS

- 为什么：HTTPS 不仅适用于电子商务网站，也适用于所有存在数据传递的网站。如今的现代浏览器对于不安全的网站在许多功能上做了些限制。例如：如果网站未使用 HTTPS，则地理定位，推送通知和 Service Workers 等功能无法正常试用。相比以前，今天设置和使用 SSL 证书容易得多([Let's Encrypt](https://letsencrypt.org/)能提供免费的 HTTPS 服务).
- 参考文献：

    - [Why Use HTTPS? | Cloudflare](https://www.cloudflare.com/learning/security/why-use-https/)
    - [Enabling HTTPS Without Sacrificing Your Web Performance - Moz](https://moz.com/blog/enabling-https-without-sacrificing-web-performance)
    - [How HTTPS Affects Website Performance](https://wp-rocket.me/blog/https-affects-website-performance/)
    - [HTTP versus HTTPS versus HTTP2 - The real story | Tune The Web](https://www.tunetheweb.com/blog/http-versus-https-versus-http2/)
    - [HTTP vs HTTPS — Test them both yourself](https://www.httpvshttps.com/)

#### 页面大小 < 1500 KB(理想 < 500 KB)

- 做什么：尽可能减少页面和资源的大小；
- 怎么做：按本篇前端性能优化指导去做，尽可能地减少资源和代码。
- 参考文献：

    - [Page Weight](https://httparchive.org/reports/page-weight#bytesTotal)
    - [What Does My Site Cost?](https://whatdoesmysitecost.com/)

#### 页面加载时间 < 3 秒

- 做什么：尽可能减少页面加载时间，以便快速将内容传递给用户。
- 为什么：网站或应用程序速度越快，反弹增加的可能性越小，换句话说，失去用户或未来客户的机会就越少。Google 对该主题的充分研究证明了这一点。
- 怎么做：使用 Page Speed Insight 或 WebPageTest 等在线工具分析可能会降低速度的工具，并使用前端性能优化指南来缩短加载时间。

    - [Compare your mobile site speed](https://www.thinkwithgoogle.com/feature/mobile/)
    - [Test Your Mobile Website Speed and Performance - Think With Google](https://testmysite.thinkwithgoogle.com/?_ga=1.155316027.1489996091.1482187369)
    - [Average Page Load Times for 2018 - How does yours compare? - MachMetrics Speed Blog](https://www.machmetrics.com/speed-blog/average-page-load-times-websites-2018/)

#### TTFB < 1.3 seconds

- 做什么：尽可能减少浏览器在接收数据之前等待的时间。
- 参考文献：

    - [What is Waiting (TTFB) in DevTools, and what to do about it](https://scaleyourcode.com/blog/article/27)
    - [Monitoring your servers with free tools is easy](https://scaleyourcode.com/blog/article/7)
    - [Time to First Byte (TTFB)](https://varvy.com/pagespeed/ttfb.html)
    - [Global latency testing tool](https://latency.apex.sh/)

#### Cookie 大小

- 做什么：如果您使用 cookie，请确保每个 cookie 不超过4096字节，并且一个域名下不超过 20 个 cookie。
- 为什么：cookie 存在于 HTTP 头中，在 Web 服务器和浏览器之间交换。保持 cookie 的大小尽可能低是非常重要的，以尽量减少对用户响应时间的影响。
- 怎么做：消除不必要的cookie
- 参考文献：

    - [Cookie specification: RFC 6265](https://tools.ietf.org/html/rfc6265)
    - [Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies)
    - [Browser Cookie Limits](http://browsercookielimits.squawky.net/)
    - [Website Performance: Cookies Don't Taste So Good - Monitis Blog](http://www.monitis.com/blog/website-performance-cookies-dont-taste-so-good/)
    - [Google's Web Performance Best Practices #3: Minimize Request Overhead - GlobalDots Blog](https://www.globaldots.com/googles-web-performance-best-practices-3-minimize-request-overhead/)

#### 最小化 HTTP 请求

- 做什么：始终确保所请求的每个文件对网站或应用程序至关重要，尽可能减少 http 请求。
- 参考文献：

    - [Combine external CSS](https://varvy.com/pagespeed/combine-external-css.html)
    - [Combine external JavaScript](https://varvy.com/pagespeed/combine-external-javascript.html)

#### 使用 CDN 提供静态文件

- 为什么：使用 CDN 可以更快地在全球范围内获取到你的静态文件。
- 参考文献

    - [10 Tips to Optimize CDN Performance - CDN Planet](https://www.cdnplanet.com/blog/10-tips-optimize-cdn-performance/)
    - [HTTP Caching  |  Web Fundamentals  |  Google Developers](https://developers.google.com/web/fundamentals/performance/optimizing-content-efficiency/http-caching)

#### 提供来自相同协议的文件

避免网站使用 HTTPS 同时使用 HTTP 来提供相同源地址的文件。

#### 提供可访问的文件

避免请求无法访问的文件（404）。

#### 正确设置 HTTP 缓存标头

合理设置 HTTP 缓存标头来减少 HTTP 请求次数。

#### 启用 GZIP 压缩

- 做什么：使用压缩方法（如 Gzip 或 Brotli）来减小 JavaScript 文件的大小。使用较小尺寸的文件，用户可以更快地下载资源，从而提高性能。
- 参考文献

    - [Check GZIP compression](https://checkgzipcompression.com/)
    - [Check Brotli Compression](https://tools.keycdn.com/brotli-test)
    - [Can I use... Brotli](https://caniuse.com/#feat=brotli)

#### 分域存放资源

由于浏览器同一域名并行下载数有限，利用多域名主机存放静态资源，增加并行下载数，缩短资源加载时间

#### 减少页面重定向

## 计算优化

- [Compute Performance](https://www.html5rocks.com/en/features/performance#ComputePerformance)
- [Javascript Memory Management](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management?redirectlocale=en-US&redirectslug=JavaScript%2FMemory_Management)
- [Compute Performance Checklist for the mobile web](http://youtu.be/0UNWi7FA36M?t=27m46s)
- [Writing Fast, Memory-efficient Javascript](http://coding.smashingmagazine.com/2012/11/05/writing-fast-memory-efficient-javascript/)
- [Using Object Pools to reduce memory churn](http://beej.us/blog/data/object-pool/)
- [High performance, garbage collector friendly code](http://buildnewgames.com/garbage-collector-friendly-code/)
- [I-Want-To-Optimize-my-JS-application-for-chrome checklist](http://mrale.ph/blog/2011/12/18/v8-optimization-checklist.html)
- [Breaking the javascript speed limit with v8](https://www.youtube.com/watch?v=UJPdhx5zTaw)
- [From Console to Chrome : Making fast javascript](http://youtu.be/XAqIpGU8ZZk?t=8m19s)
- [Perf the web forward](http://allyoucanleet.com/post/52667781698/jsconf-us-13-screencast)
- [The Cost Of JavaScript - YouTube](https://www.youtube.com/watch?v=_bzqF05xsC4)

### 优化 JavaScript 执行

- 做什么：检查 JavaScript 文件（以及 CSS）中的性能问题。
- 为什么：JavaScript 复杂性可能会降低运行时性能。识别这些可能的问题对提供流畅的用户体验来说至关重要。
- 怎么做：使用 Chrome 开发者工具中的时间轴工具来评估脚本事件，并找到可能需要花费太多时间的事件。
- 参考文献：

    - [Speed Up JavaScript Execution](https://developers.google.com/web/tools/chrome-devtools/rendering-tools/js-execution)
    - [JavaScript Profiling With The Chrome Developer Tools — Smashing Magazine](https://www.smashingmagazine.com/2012/06/javascript-profiling-chrome-developer-tools/)
    - [How to Record Heap Snapshots  |  Tools for Web Developers  |  Google Developers](https://developers.google.com/web/tools/chrome-devtools/memory-problems/heap-snapshots)
    - [Chapter 22 - Profiling the Frontend - Blackfire](https://blackfire.io/docs/book/22-frontend-profiling)
    - [30 Tips To Improve Javascript Performance](http://www.monitis.com/blog/30-tips-to-improve-javascript-performance/)

### 使输入处理程序去除抖动

TODO

## 渲染优化

- [Render Performance](https://www.html5rocks.com/en/features/performance#RenderPerformance)
- [Rendering Performance](https://developers.google.com/web/fundamentals/performance/rendering/)
- [High Performance Animations](https://www.html5rocks.com/en/tutorials/speed/high-performance-animations/)
- [动画与性能](https://developers.google.com/web/fundamentals/design-and-ux/animations/animations-and-performance)
- [Avoiding Unnecessary Paints](https://www.html5rocks.com/en/tutorials/speed/unnecessary-paints/)
- [Avoiding Unnecessary Paints: Animated GIF Edition](https://www.html5rocks.com/en/tutorials/speed/animated-gifs/)
- [Scrolling Performance](http://www.html5rocks.com/tutorials/speed/scrolling/)
- [Parallaxin’](http://www.html5rocks.com/tutorials/speed/parallax/)
- [High DPI Canvas](http://www.html5rocks.com/tutorials/canvas/hidpi/)
- [Leaner, Meaner, Faster Animations with requestAnimationFrame](http://www.html5rocks.com/tutorials/speed/animations/)
- [Jank Free: a curated list of rendering performance resources](http://www.jankfree.org/)
- [Web page design with the GPU in mind](https://developers.google.com/events/io/sessions/325091862)
- [Gone In 60 Frames Per Second: A Pinterest Paint Performance Case Study](http://www.smashingmagazine.com/2013/06/10/pinterest-paint-performance-case-study/)
- [Using CSS to get faster, smoother animations](http://coding.smashingmagazine.com/2013/03/04/animating-web-gonna-need-bigger-api/)
- [How Fast UX is all about performance.](http://alistapart.com/article/improving-ux-through-front-end-performance)
- [On Layout and web performance](http://kellegous.com/j/2013/01/26/layout-performance/)
- [How to debug painting performance issues](http://youtu.be/bMZZOzuJCgk)
- [CSS Paint Times and Page Render Weight](https://www.html5rocks.com/en/tutorials/speed/css-paint-times/)
- [Scrolling Performance](https://www.html5rocks.com/en/tutorials/speed/scrolling/)
- [GPU Accelerated Compositing in Chrome](http://www.chromium.org/developers/design-documents/gpu-accelerated-compositing-in-chrome)
- [Leaner, Meaner, Faster Animations with requestAnimationFrame](https://www.html5rocks.com/en/tutorials/speed/animations/)
- [Jank Busting for Better Rendering Performance](https://www.html5rocks.com/en/tutorials/speed/rendering/)
- [CSS Trigger](https://csstriggers.com/) / [CSS Triggers](https://css-tricks.com/css-triggers/)

    - [Things nobody ever taught me about CSS.](https://medium.com/@devdevcharlie/things-nobody-ever-taught-me-about-css-5d16be8d5d0e)
    - [What is the difference between layout, painting and compositing?](https://www.quora.com/What-is-the-difference-between-layout-painting-and-compositing)
    - [What is reflow and repaint in these steps Styles -> Layout -> Paint -> Composite](https://stackoverflow.com/questions/39210858/what-is-reflow-and-repaint-in-these-steps-styles-layout-paint-composite)
    - [Browser Rendering Optimization](https://github.com/vasanthk/browser-rendering-optimization/blob/master/README.md)
    - [浏览器 渲染,绘制流程及性能优化](https://zhuanlan.zhihu.com/p/25279069)

- [浏览器渲染详细过程：重绘、重排和 composite 只是冰山一角](https://juejin.im/entry/590801780ce46300617c89b8)
- [无线性能优化：Composite](http://taobaofed.org/blog/2016/04/25/performance-composite/)
- [网页性能管理详解](https://www.ruanyifeng.com/blog/2015/09/web-page-performance-in-depth.html)

### 避免大型、复杂的布局和布局抖动

TODO

## 框架优化

### Angular

- [Angular Performance Checklist](https://github.com/mgechev/angular-performance-checklist)

### React

- [Optimizing Performance - React](https://reactjs.org/docs/optimizing-performance.html)
- [React image manipulation | Cloudinary](https://cloudinary.com/documentation/react_image_manipulation)
- [Debugging React performance with React 16 and Chrome Devtools.](https://building.calibreapp.com/debugging-react-performance-with-react-16-and-chrome-devtools-c90698a522ad)

## 参考文献

- [Front-End Performance Checklist](https://github.com/thedaviddias/Front-End-Performance-Checklist)
- [HTML5 FEATURES PERFORMANCE](https://www.html5rocks.com/en/features/performance)
- [Front-End Performance Checklist 2019 [PDF, Apple Pages, MS Word]](https://www.smashingmagazine.com/2019/01/front-end-performance-checklist-2019-pdf-pages/)
- [Designing for Performance](http://designingforperformance.com/index.html)
- [Page Speed Best Practices](https://www.checkbot.io/guide/speed/)
- [Client side performance](http://taligarsiel.com/ClientSidePerformance.html)
- [Image Compression for Web Developers](https://www.html5rocks.com/en/tutorials/speed/img-compression/)
- [Best Practices for a Faster Web App with HTML5](https://www.html5rocks.com/en/tutorials/speed/quick/)
- [Performance Best Practices in the HTTP/2 Era](https://deliciousbrains.com/performance-best-practices-http2/)
- [Best Practices for Speeding Up Your Web Site](https://developer.yahoo.com/performance/rules.html)
- [Web Performance Best Practices and Rules](http://yslow.org/)
- [PageSpeed Insights 规则](https://developers.google.com/speed/docs/insights/rules)
