# Performance

性能接口

- [Web Performance Working Group](https://www.w3.org/webperf/)
- [`performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance)

## 性能分类

按照数据的特性将性能分类以下几类：导航加载、资源加载、首次绘制、帧率、耗时较长的任务和自定义性能测试。

### 导航

导航加载指的是浏览器 HTML 文档加载时间。目前，W3C 已经制定了两个版本关于导航加载时长获取接口的规范。

1. [`Performance​Timing`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming)：第一版接口，大部分浏览器已经支持，规范文档参考 [Navigation Timing](https://www.w3.org/TR/navigation-timing/#sec-navigation-timing-interface)
2. [`PerformanceNavigationTiming`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)：第二版接口，已经不少浏览器支持，规范文档参考 [Navigation Timing Level 2](https://w3c.github.io/navigation-timing/#sec-PerformanceNavigationTiming)

![timestamp-diagram.svg](./timestamp-diagram.svg)

两个版本的导航性能接口能获取的数据维度基本一致，都包含该上图所示的相关节点数据。但是，他们存在一个主要的不同点在于 `Performance​Timing` 使用传统的时间戳来给各个节点属性赋值，而 `PerformanceNavigationTiming` 采用了高精度时间。

#### `Performance​Timing`

`Performance​Timing` 的相关数据可以直接访问 `window.performance.timing` 获取，浏览器在每个 HTML 页面上自动实例化一个 `PerformanceTiming` 对象并赋值给 `window.performance.timing`，包含一系列如上图所示的导航加载时间数据。

参考文献：

- [`Performance​.timing`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timing)
- [`Performance​Timing`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming)
- [Navigation Timing](https://www.w3.org/TR/navigation-timing)

#### `PerformanceNavigationTiming`

`PerformanceNavigationTiming` 的相关数据可以通过 `window.performance` 的方法 `getEntries`、`getEntriesByName` 和 `getEntriesByType` 来获取。这几个接口返回一个数组，该数组包含各种性能指标数据，其中包含 `PerformanceNavigationTiming` 的实例，该实例所包含的性能数据参见上图。

参考文献：

- [`performance.getEntries`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntries)
- [`performance.getEntriesByName`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByName)
- [`performance.getEntriesByType`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/getEntriesByType)
- [`Navigation Timing Level 2`](https://w3c.github.io/navigation-timing)

### 资源加载

Performance 接口提供了获取网页资源加载相关的性能数据，这些资源包括：`XMLHttpRequest`、`<SVG>`、图片、样式和脚本等。有关资源加载的性能数据可以通过`window.performance` 的方法 `getEntries`、`getEntriesByName` 和 `getEntriesByType` 来获取，此外，也可以使用 `Performance​Observer` 来监听获取。

参考文献：

- [PerformanceResourceTiming](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)
- [Resource Timing Level 1](https://www.w3.org/TR/resource-timing-1/)

### 首次绘制 / 首次内容绘制

首次绘制是指浏览器将构造好的渲染树渲染成屏幕像素的时机点，而首次内容绘制是指具体内容，如文本和图片等，渲染到屏幕上的时间。有关绘制时间的性能数据都存储在 `Performance​Paint​Timing` 对象示例中，可以通过以下方式获取：

1. `window.performance.getEntriesByType('paint')`
2. `window.performance.getEntriesByName('first-paint')` / `window.performance.getEntriesByName('first-contentful-paint')`
3. `window.performance.getEntries()`：在返回的数组中过滤出相关数据

参考文献

- [Performance​Paint​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming)
- [Paint Timing](https://w3c.github.io/paint-timing/#sec-PerformancePaintTiming)

### 帧率

帧率相关的性能数据被封装在 `Performance​Paint​Timing` 对象实例中，可以通过以下方式获取：

1. `window.performance.getEntriesByType('frame')`
2. `window.performance.getEntries()`：在返回的数组中过滤出相关数据

ps：截止到目前（201904），帧率相关的性能指标数据接口还没有相关浏览器支持，需要监测帧率可以通过 `requestAnimationframe` 来模拟实现。

参考文献

- [Performance​Frame​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceFrameTiming)
- [Frame Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceFrameTiming)

### 耗时较长的任务

`Performance​Long​Task​Timing` 封装了耗时较长的任务的性能数据，可以通过以下方式获取：

`new PerformanceObserver(function () {}).observe({ entryTypes: ['longtask'] })`

ps：目前这个 API 还在实验当中，没有得到浏览器的广泛支持，目前只有 Chrome 和安卓支持。但类似帧率，可以使用 `requestAnimationframe` 来模拟实现。

参考文献

- [Performance​Long​Task​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)
- [Long Tasks API 1](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)

### 自定义性能测试

Performance 提供了一套基于高精度时间的性能测试接口。

- [`performance.mark`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/mark)
- [`performance.measure`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/measure)
- [`PerformanceMark`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMark)
- [`Performance​Measure`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMeasure)
- [User Timing Level 2](https://w3c.github.io/user-timing/#dom-performance-measure)
- [User Timing](https://www.w3.org/TR/user-timing/#performancemeasure)

参考文献：

- [User Timing Level 2](https://w3c.github.io/user-timing)

### 其他

#### 内存信息

`window.performance.memory` 返回内存使用信息

- `usedJSHeapSize`：JS 对象（包括V8引擎内部对象）占用的内存，一定小于 totalJSHeapSize
- `totalJSHeapSize`：可使用的内存
- `jsHeapSizeLimit`：内存大小限制

ps：非标准属性，只有 Chrome 才支持

#### 导航类型

[`window.performance.navigation`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/navigation) 返回 [`PerformanceNavigation`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigation) 的对象实例，包含有关导航类型相关的数据，例如：访问类型（前进、后退或刷新），重定向次数等。

## 用法详解

### 查询性能数据

[`PerformanceEntry`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry)

- 简介：PerformanceEntry 代表了各类性能测量的指标。
- 子类

    - [`Performance​Long​Task​Timing`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)
    - [`PerformanceMark`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMark)
    - [`Performance​Navigation​Timing`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming)

### 监听性能数据

[`Performance​Observer`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver)

Performance​Observer 用于监听性能指标的测量事件。

### 清除性能缓存

由于在一个网页应用中资源的数量是不确定的，一个复杂的应用可能包含成败上千的资源请求，浏览器不可能全部存储这些资源加载的性能数据。所以 Performance 还提供了以下几个相关的方法来控制缓存：

- [`performance.clearResourceTimings`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/clearResourceTimings)
- [`performance.onresourcetimingbufferfull`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/onresourcetimingbufferfull)
- [`performance.setResourceTimingBufferSize`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/setResourceTimingBufferSize)
- [`performance.clearMarks`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/clearMarks)
- [`performance.clearMeasures`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/clearMeasures)

### 高精度时间

[High Resolution Time Level 2](https://www.w3.org/TR/hr-time-2/#dom-performance-timeorigin)

- [`performance.now`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now)
- [`performance.timeOrigin`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/timeOrigin)：返回一个高精度的时间戳，例如：`1518354643295.86`
- [`performance.toJSON`](https://developer.mozilla.org/en-US/docs/Web/API/Performance/toJSON)

参考文献

- [When milliseconds are not enough: performance.now](https://developers.google.com/web/updates/2012/08/When-milliseconds-are-not-enough-performance-now)
- [requestAnimationFrame API: now with sub-millisecond precision](https://developers.google.com/web/updates/2012/05/requestAnimationFrame-API-now-with-sub-millisecond-precision)

## 教程

- [Performance API](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [Assessing Loading Performance in Real Life with Navigation and Resource Timing](https://developers.google.com/web/fundamentals/performance/navigation-and-resource-timing/)
- [Measuring network performance with Resource Timing API](https://developers.googleblog.com/2013/12/measuring-network-performance-with.html)
- [Measuring Page Load Speed with Navigation Timing](https://www.html5rocks.com/en/tutorials/webperformance/basics/)
- [Understanding Resource Timing](https://developers.google.com/web/tools/chrome-devtools/network/understanding-resource-timing)
- [ResourceTiming in Practice](https://nicj.net/resourcetiming-in-practice/)
- [Using Navigation Timing APIs to understand your webpage](https://community.akamai.com/customers/s/article/Using-Navigation-Timing-APIs-to-understand-your-webpage?language=en_US)
- [初探 performance – 监控网页与程序性能](http://www.alloyteam.com/2015/09/explore-performance/)
- [使用performance API 监测页面性能](http://www.alloyteam.com/2012/11/performance-api-monitoring-page-performance/)
- [使用 HMTL5 API 监控前端性能](https://www.infoq.cn/article/html5-performance-api-monitoring)
- [Performance API By 《JavaScript 标准参考教程》](http://javascript.ruanyifeng.com/bom/performance.html)
- [Performance Api 在网页性能监测的使用和表现差异](https://juejin.im/entry/58abf9c72f301e006bdbc6d8)
- [如何评价页面的性能](http://taobaofed.org/blog/2015/11/09/web-performance/)
- [前端页面性能参数搜集](http://www.cnblogs.com/strick/p/5750022.html)

## 兼容性

| 类型 | iOS | Android |
| --- | --- | --- |
| 导航 | iOS9+ 支持 `Performance​Timing`，不支持 `PerformanceNavigationTiming` | 支持 `Performance​Timing`，Chrome57+ 支持 `PerformanceNavigationTiming` |
| 资源 | iOS11+'s WKWebview | 支持 |
| 绘制 | 不支持 | Chrome60+ |
| 帧率 | 不支持 | 不支持 |
| 耗时较长的任务 | 不支持 | Chrome59+ |
| 自定义性能测试 | iOS11+'s WKWebview | 支持 |
| 内存信息 | 不支持 | 非标准属性，只有 Chrome 内核的浏览器才支持 |
| 导航类型 | iOS9+ | 支持 |
| 高性能 | iOS9+ | 支持 |

ps：以上支持情况都是按本文编写时间为准（201904）

参考文献

- [`Performance`](https://developer.mozilla.org/en-US/docs/Web/API/Performance#Browser_compatibility)
- [`Performance​Timing`](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceTiming#Browser_compatibility)

    ps：虽然 MDN 上显示 iOS 不完整支持该功能，但实际上 iOS9 以上版本已经完整支持了 `Performance​Timing`

- [Performance​Navigation​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming#Browser_compatibility)
- [Performance​Resource​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming#Browser_compatibility)

    ps：iOS11+ 需要 WKWebview 才支持

- [Performance​Paint​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformancePaintTiming#Browser_compatibility)
- [Performance​Frame​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceFrameTiming#Browser_compatibility)
- [Performance​Long​Task​Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming#Browser_Compatibility)

    ps：虽然 MDN 上显示安卓 Chrome58+ 已经支持，实际上并不支持（实验特性？）。

- [Performance​Mark](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMark#Browser_compatibility)

    ps：iOS11+ 需要 WKWebview 才支持

- [PerformanceMeasure](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceMeasure#Browser_compatibility)

    ps：iOS11+ 需要 WKWebview 才支持

- [Performance​Entry](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceEntry#Browser_compatibility)

    ps：iOS11+ 需要 WKWebview 才支持

- [Performance​Observer](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver#Browser_compatibility)

    ps：iOS11+ 需要 WKWebview 才支持

- [Navigation Timing API](https://caniuse.com/#feat=nav-timing)

    - [Navigation Timing API Of Chrome](https://www.chromestatus.com/feature/5584144679567360)
    - [Navigation Timing 2 Of Chrome](https://www.chromestatus.com/feature/5409443269312512)
    - [Navigation Timing Level 1 Of Webkit](https://webkit.org/status/#specification-navigation-timing-level-1)
    - [Navigation Timing API Of Edget](https://developer.microsoft.com/en-us/microsoft-edge/platform/status/navigationtimingapi/)

- [Resource Timing](https://caniuse.com/#feat=resource-timing)

## 常见问题

- 在 iOS Safari 上很多 H5 应用会通过 Deep Links 唤起应用，但这会导致 window 不会触发 load 事件，performance 上的 loadEventStart/loadEventEnd 均为 0

    参见测试实例 [loadendiszero.html](./examples/loadendiszero.html)


## 实际应用

- [micmro/performance-bookmarklet](https://github.com/micmro/performance-bookmarklet)
- [andydavies/waterfall](https://github.com/andydavies/waterfall) - Bookmarklet that produces Page Load Waterfalls using the Resource Timing API.
- [RUM-SpeedIndex](https://github.com/WPO-Foundation/RUM-SpeedIndex) - Calculate SpeedIndex measurements from the field.
- [kaaes/timing](https://github.com/kaaes/timing) - Visual presentation of Navigation Timing API performance object.
- [perfmap](https://github.com/zeman/perfmap)
- [stats.js](https://github.com/mrdoob/stats.js)
- [perfume.js](https://github.com/Zizzamia/perfume.js/blob/master/README-zh_CN.md)

## 参考文献

- [Measuring Page Load Speed with Navigation Timing](https://www.html5rocks.com/en/tutorials/webperformance/basics/)
