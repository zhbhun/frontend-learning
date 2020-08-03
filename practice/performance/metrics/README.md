# 性能指标

> 您可能已无数次听人提及性能的重要性，以及网页应用的运行速度十分关键。
>
> 但是，当您尝试回答“我的应用有多快？”这个问题时，您就会意识到，“快”是一个很模糊的概念。 我们所谓的“快”究竟是指什么？其情境为何？ 为谁提供高速度？
>
> 以用户为中心；最终目标不是让您的网站在任何特定设备上都能运行很快，而是使用户满意。
>
> 当用户导航到网页时，通常会寻找视觉反馈，以确信一切符合预期。

| 体验 | 说明 |
| --- | --- |
| 是否发生？ | 导航是否成功启动？服务器是否有响应？ |
| 是否有用？ | 是否已渲染可以与用户互动的足够内容？ |
| 是否可用？ | 用户可以与页面交互，还是页面仍在忙于加载？ |
| 是否令人愉快？ | 交互是否顺畅而自然，没有滞后和卡顿？ |

---

![rail](./rail.png)

- Response：立即响应用户，在 100 毫秒以内确认用户输入。
- Animation：设置动画或滚动时，在 10 毫秒以内生成帧。
- Idle：最大程度增加主线程的空闲时间。
- Load：持续吸引用户，在 5 秒内传送内容并实现交互。

---

用户对性能延迟的感知

| 时间 | 感知 |
| --- | --- |
| 0 到 16 毫秒 | 用户非常擅长跟踪动作，当动画不流畅时，他们不喜欢它。只要每秒渲染60个新帧，它们就会将动画视为平滑的。这是每帧16毫秒，包括浏览器将新帧绘制到屏幕所需的时间，留下应用程序大约10毫秒来生成一个帧。 |
| 0 到 100 毫秒 | 响应此时间窗口内的用户操作，用户感觉结果是即时的。任何更长的时间，行动和反应之间的联系都被打破了。 |
| 100 至 300 毫秒 | 用户会遇到轻微的可察觉的延迟。 |
| 300 至 1000 毫秒 | 在这个窗口中，事物感觉是任务自然而持续发展的一部分。对于Web上的大多数用户，加载页面或更改视图代表一项任务。 |
| 1000 毫秒或更长 | 超过1000毫秒（1秒），用户将失去对他们正在执行的任务的关注。 |
| 10000 毫秒或更长 | 超过10000毫秒（10秒），用户感到沮丧，可能会放弃任务。他们可能会或可能不会在以后回来。 |

---

参考文献

- [Measure Performance with the RAIL Model](https://developers.google.com/web/fundamentals/performance/rail)
- [User-centric Performance Metrics](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics)
- [User-centric performance metrics](https://web.dev/user-centric-performance-metrics/)
- [Assessing Loading Performance in Real Life with Navigation and Resource Timing](https://developers.google.com/web/fundamentals/performance/navigation-and-resource-timing#phoning_home)

## [响应](https://developers.google.com/web/fundamentals/performance/rail#response)

- 目标：在 100 毫秒内完成用户输入事件的处理，用户花费他们主要时间是在等待网站响应他们的输入，而不是等待网站加载（例如：点击操作触发的异步请求，用户不会意识到这个需要等待网站加载，他们想要的是网站在点击后立即响应后，这时候可以在用户输入后提供一些友好的反馈）。
- 原因：超出 100 毫秒的响应时，操作与反应之间的连接就会中断。
- 指南：

    - 在 50 毫秒内处理用户输入事件以确保在 100ms 内可见响应。

        为什么是 50 毫秒？
        
        假设一个用户输入事件需要处理 50ms 以上，这时候有一个更紧急的用户输入事件需要处理，但必须等前一个事件处理完才能响应这个紧急操作（JS 单线程机制），等到处理万前一个事件再处理该该事件时响应时间很可能会超出 100ms，这时候用户会感觉到明显的延迟和卡顿。
        
        对于用户输入事件处理需要超过 50 毫秒的操作，可以将该操作进行分片，并利用加载动画来提供反馈，同时保证设备有足够的空闲事件去处理用户输入操作，此外也可以使用 web worker 进行多线程开发。

    - 对于完成时间超过 50 毫秒的操作，请始终提供反馈。


    ps：有哪些场景下处理用户输入事件处理会超过 100 毫秒？

    - 异步网络请求；
    - 移动端的点击延迟；
    - 大量复杂计算，例如：DOM 重排重绘；
    - 服务端渲染时的首次输入延迟

- 指标：

    - [FID(First Input Delay)](https://developers.google.com/web/updates/2018/05/first-input-delay)
    - [Tracking input latency](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#tracking_input_latency)

- 示例

    - [input-latency](https://codesandbox.io/embed/oxk471yy76?fontsize=14)

## [动画](https://developers.google.com/web/fundamentals/performance/rail#animation)

- 目标：要保证动画的流畅性，一般只要保证帧率能够达到 60f 即可。动画每帧的最大预算为 16 毫秒（1000 毫秒 / 每秒 60 帧 ≈ 16 毫秒），但浏览器需要大约 6 毫秒来渲染每帧，因此动画中需要在 10ms 或更短的时间内生成每个帧。如果无法符合此预算，帧率将下降，并且内容会在屏幕上抖动。此现象通常称为卡顿，会对用户体验产生负面影响。
- 原因：

    目前大多数设备的屏幕刷新率为 60 次/秒。因此，如果在页面中有一个动画或渐变效果，或者用户正在滚动页面，那么浏览器渲染动画或页面的每一帧的速率也需要跟设备屏幕的刷新率保持一致。

    [脑洞大开：为啥帧率达到 60 fps 就流畅？](https://www.jianshu.com/p/71cba1711de0)

- 指南：

    在开发动画等交互效果时，需要了解浏览器如何处理 HTML、JavaScript 和 CSS，并确保您编写的代码（和您要包括的其他第三方代码）尽可能高效地运行。

    ![frame-full.jpg](./frame-full.jpg)

    不一定每帧都总是会经过该流程每个部分的处理，不管是使用 JavaScript、CSS 还是网络动画，在实现视觉变化时，该流程针对指定帧的运行通常有三种方式：

    ![frame-full.jpg](./frame-full.jpg)

    ![frame-full.jpg](./frame-no-layout.jpg)

    ![frame-full.jpg](./frame-no-layout-paint.jpg)

    参考文献

    - [Rendering Performance](https://developers.google.com/web/fundamentals/performance/rendering/)
    - [Stick to Compositor-Only Properties and Manage Layer Count](https://developers.google.com/web/fundamentals/performance/rendering/stick-to-compositor-only-properties-and-manage-layer-count)
    - [What do people want from a news experience?](https://paul.kinlan.me/what-news-readers-want/)

    ps：尽量避免重排和重绘

    - 使用 CSS animation 来实现帧动画
    - 通过设置 transform 3d 来强制 CSS 动画开启 GPU 加速

- 指标：帧率
- 检测：TODO

## [空闲](https://developers.google.com/web/fundamentals/performance/rail#idle)

- 目标：最大化空闲时间，以增加页面在 100 毫秒内响应用户输入的几率。
- 原因：最大化空闲时间才能实现即时响应和 60 帧动画
- 指南：

    - 利用空闲时间完成推迟的工作。
    - 要实现小于 100 毫秒的响应，应用必须在每 50 毫秒内将控制返回给主线程，这样应用就可以执行其像素管道、对用户输入作出反应，等等。
    - 推迟的工作应分成每个耗时约 50 毫秒的多个块。如果用户开始交互，优先级最高的事项是响应用户。

- 指标：[Long tasks](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#long_tasks)

    - [Tracking long tasks](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#tracking_long_tasks)
    - [Long Tasks API 1 Spec](https://w3c.github.io/longtasks/)
    - [Long Tasks API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Long_Tasks_API)

    ps：思考什么时候该关注该项指标？一些操作会影响用户输入响应，影响动画帧率时需要优化空闲时间。例如：

    - 尽可能减少预加载数据，以便您的应用快速加载，并利用空闲时间加载剩余数据。
    - 一些计算量较大的操作，Canvas 导出 Gif 图片等。

- 检测

    - 黑客手段


        ```js
        (function detectLongFrame() {
        var lastFrameTime = Date.now();
        requestAnimationFrame(function() {
            var currentFrameTime = Date.now();

            if (currentFrameTime - lastFrameTime > 50) {
            // Report long frame here...
            }

            detectLongFrame(currentFrameTime);
        });
        }());
        ```

    - Performance API

        ```js
        const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            // `entry` is a PerformanceEntry instance.
            console.log(entry.entryType);
            console.log(entry.startTime); // DOMHighResTimeStamp
            console.log(entry.duration); // DOMHighResTimeStamp
        }
        });

        // Start observing the entry types you care about.
        observer.observe({entryTypes: ['resource', 'paint']});
        ```

- 示例

    - [Long Task](https://codesandbox.io/embed/6zrwv4ro4n?fontsize=14)
    - [Long Task by requestAnimationFrame](https://codesandbox.io/s/mjqmyxk1m9)

## [加载](https://developers.google.com/web/fundamentals/performance/rail#load)

- 目标：

    - 针对访问网站的设备和网络情况优化加载性能。目前，在低速的 3G 网络下首次加载页面和可交互时间保证在 5 秒内是较好的实现（Google 文档给出的标准（参考的是 [The Mobile Economy 2017](https://www.gsma.com/mobileeconomy/)），目前大部分用户已经使用 4G 网络，该指标相关数据仅供参考。），参考 [Can You Afford It?: Real-world Web Performance Budgets](https://infrequently.org/2017/10/can-you-afford-it-real-world-web-performance-budgets/)。
    - 二级页面和二次访问，应该保证页面的加载时间在 2 秒内；

- 原因：当页面加载缓慢时，用户注意力会徘徊，用户会将任务视为已失败。快速加载的网站平均会话时间较长，跳出率较低，广告可见度较高。
- 指南

    - 排查影响页面加载性能的因素：网络速度、延迟、硬件性能、JavaScript 解析等；
    - 启用渐进式渲染并在后台执行一些操作，将非必要负载推迟到空闲时间段，专注于优化优先显示与当前用户操作有关的内容，避免渲染阻塞；
    - 测试用户常用的移动设备和网络连接的负载性能；

        ps：常用设备可以统计访问网站所使用的设备和网络链接信息，或者参考 GSMA 的 [The Mobile Economy](https://www.gsma.com/mobileeconomy/)。

- 指标

    ![speed-metrics.png](./speed-metrics.png)

    - FP(First Paint)：首次绘制 —— 白屏时间点
    - [FCP(First Contentful Paint)](https://developers.google.com/web/tools/lighthouse/audits/first-contentful-paint)：首次内容绘制
    - [FMP(First Meaningful Paint)](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint)：首次有效绘制
    - [Speed Index](https://developers.google.com/web/tools/lighthouse/audits/speed-index#how) —— 首屏时间点
    - [First CPU Idle](https://developers.google.com/web/tools/lighthouse/audits/first-cpu-idle)
    - FI(First Interactive)：首次交互时间
    - [TTI(Time to Interactive)](https://developers.google.com/web/tools/lighthouse/audits/time-to-interactive)：可交互时间
    - CI(Consistently Interactive)：页面总下载时间

    | 体验 | 指标 |
    | --- | --- |
    | 是否发生？ | 首次绘制 (FP)/首次内容绘制 (FCP) |
    | 是否有用？ | 首次有效绘制 (FMP)/主角元素计时 |
    | 是否可用？ | 可交互时间 (TTI) |
    | 是否令人愉快？ | 耗时较长的任务（在技术上不存在耗时较长的任务） |

参考文献

- [User-centric Performance Metrics](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics)
- [Assessing Loading Performance in Real Life with Navigation and Resource Timing](https://developers.google.com/web/fundamentals/performance/navigation-and-resource-timing/)
- [Important Metrics You Should Be Tracking](https://github.com/benjaminhoffman/web-performance-optimizations/blob/master/Important_Metrics.md)
- [Bounce RateConversionRate Cart Size PageViews200ms  Measuring Web Performance](https://www.slideshare.net/dmolsenwvu/measuring-web-performance-18921979/12-Bounce_RateConversionRate_Cart_Size_PageViews200ms)
- ['time to first paint' vs 'First Meaningful Paint'](https://stackoverflow.com/questions/42209419/time-to-first-paint-vs-first-meaningful-paint)
- [Paint based metrics](https://calibreapp.com/docs/metrics/paint-based-metrics)
- [Web Performance Madness - brightonSEO 2018](https://www.slideshare.net/bastiangrimm/web-performance-madness-brightonseo-2018)
- [The Mobile Economy](https://www.gsma.com/r/mobileeconomy/)
- [User Timing and Custom Metrics](https://speedcurve.com/blog/user-timing-and-custom-metrics/)

### FP / FCP

FP 和 FCP 指标用于标记导航之后浏览器在屏幕上渲染像素的时间点

- FP：标记浏览器渲染任何在视觉上不同于导航前屏幕内容之内容的时间点；
- FCP：标记的是浏览器渲染来自 DOM 第一个内容的时间点，该内容可能是文本、图像、SVG 甚至 `<canvas>` 元素。

参考文献

- [Paint Timing spec](https://w3c.github.io/paint-timing/#sec-terminology)
- [First Contentful Paint](https://developers.google.com/web/tools/lighthouse/audits/first-contentful-paint)
- [First Contentful Paint Explained](https://gtmetrix.com/blog/first-contentful-paint-explained/)
- [What is First Contentful Paint?](https://loadfocus.com/blog/2019/01/31/what-is-first-contentful-paint/)
- [Speeding up First Contentful Paint while loading web fonts using @font-face](https://medium.com/@santhoshsundar/speeding-up-first-contentful-paint-while-loading-web-fonts-using-font-face-d7106abe664a)
- [Tracking FP/FCP](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#tracking_fpfcp)

### FMP

网页的这些“最重要部分”通常称为主角元素。 例如，在 YouTube 观看页面上，主视频就是主角元素。 在 Twitter 上，主角元素可能是通知标志和第一篇推文。 在天气应用上，主角元素是指定地点的天气预测。 在新闻网站上，主角元素可能是重大新闻和置顶大图。在网页上，几乎总有一部分内容比其他部分更重要。 如果页面最重要的部分能迅速加载，用户可能不会注意到其余部分是否加载。

参考文献

- [First Meaningful Paint](https://developers.google.com/web/tools/lighthouse/audits/first-meaningful-paint)
- [Tracking FMP using hero elements](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#tracking_fmp_using_hero_elements)
- [Time to First Meaningful Paint](https://docs.google.com/document/d/1BR94tJdZLsin5poeet0XoTW60M0SjvOJQttKT-JK8HI/view#heading=h.13w16xsxh9u9)

FMP 已经被 Google 废弃，参考下列文献

- [First Meaningful Paint](https://web.dev/first-meaningful-paint/)
- [Issue 1096008: Remove FMP](https://bugs.chromium.org/p/chromium/issues/detail?id=1096008)

### Speed Index

- [Speed Index By WebPageTest](https://sites.google.com/a/webpagetest.org/docs/using-webpagetest/metrics/speed-index)
- [paulirish/speedline](https://github.com/paulirish/speedline)

### TTI

参考文献

- [TTI(Time to Interactive)](https://developers.google.com/web/tools/lighthouse/audits/time-to-interactive)
- [Time to interactive](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#time_to_interactive)
- [Time to Interactive Explainer](https://github.com/WICG/time-to-interactive#definition)
- [Tracking TTI](https://developers.google.com/web/fundamentals/performance/user-centric-performance-metrics#tracking_tti)
- [tti-polyfill](https://github.com/GoogleChromeLabs/tti-polyfill)
- [First Interactive and Consistently Interactive](https://docs.google.com/document/d/1GGiI9-7KeY3TPqS3YT271upUVimo-XiL5mwWorDUD4c/edit#heading=h.k1h25blerz3i)

### 其他

- [前端数据之美 -- 基础篇](http://fex.baidu.com/blog/2014/05/front_end-data/)
- [Web Performance Madness - brightonSEO 2018](https://www.slideshare.net/bastiangrimm/web-performance-madness-brightonseo-2018)
- [FMP: First Meaningful Paint](https://scotch.io/courses/10-web-performance-audit-tips-for-your-next-billion-users-in-2018/fmp-first-meaningful-paint)
- [PerformancePaintTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming)
- https://github.com/w3c/paint-timing
- [Measuring Web Performance](https://www.slideshare.net/dmolsenwvu/measuring-web-performance-18921979/12-Bounce_RateConversionRate_Cart_Size_PageViews200ms)

参考文献

- [Estimated Input Latency](https://developers.google.com/web/tools/lighthouse/audits/estimated-input-latency)
- [GoogleChromeLabs/first-input-delay](https://github.com/GoogleChromeLabs/first-input-delay)
- [Moving beyond window.onload()](https://www.stevesouders.com/blog/2013/05/13/moving-beyond-window-onload/)
- [Apdex-G and Apdex-R Composite Sections 1-5](http://www.apdex.org/index.php/2010/09/apdex-g-and-apdex-r-composite-sections-1-5/) / [Apdex 应用性能指数](https://www.frontjs.com/doc/view/apdex)
- [Start Performance Budgeting](https://addyosmani.com/blog/performance-budgets/)
- [Measuring Site Performance— Part 1](https://medium.com/@keyurkshah/measuring-site-performance-part-1-280268ae0c2d)
- [Measuring Site Performance — Part 2 — Introducing Sitespeed.io](https://medium.com/@keyurkshah/measuring-site-performance-part-2-introducing-sitespeed-io-76ef6a8d76e4)
- https://github.com/paulirish/speedline - Calculate the speed index and visual performance metrics from chrome dev tool timeline (recently: pmdartus -> paulirish)
- https://github.com/WPO-Foundation/visualmetrics
