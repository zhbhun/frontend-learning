- serif(衬线)
- sans-serif(无衬线)
- monospace(等宽)
- fantasy(梦幻)
- cuisive(草体)

## 系统字体

> system-ui,-apple-system,BlinkMacSystemFont,segoe ui,Roboto,Helvetica,Arial,sans-serif,apple color emoji,segoe ui emoji,segoe ui symbol;

- system-ui，使用各个支持平台上的默认系统字体
- -apple-system， 在一些稍低版本 Mac OS X 和 iOS 上，它针对旧版上的 Neue Helvetica 和 Lucida Grande 字体，升级使用更为合适的 San Francisco Fonts
- BlinkMacSystemFont，针对一些 Mac OS X 上的 Chrome 浏览器，使用系统默认字体
- segoe ui，在 Windows 及 Windows Phone 上选取系统默认字体
- Roboto，面向 Android 和一些新版的的 Chrome OS
- Helvetica,Arial，在针对不同操作系统不同平台设定采用默认系统字体后，针对一些低版本浏览器的降级方案
- sans-serif，兜底方案，保证字体风格统一，至少也得是无衬线字体

参考文献

- [谈谈一些有趣的CSS题目（16）-- 你该知道的字体 font-family ](https://www.cnblogs.com/coco1s/p/11350642.html)
- [Web 字体 font-family 再探秘](https://www.cnblogs.com/coco1s/p/11350642.html)
- [Using UI System Fonts In Web Design: A Quick Practical Guide](https://www.smashingmagazine.com/2015/11/using-system-ui-fonts-practical-guide/)
- [font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif ](https://github.com/necolas/normalize.css/issues/665)

## [font-display](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@font-face/font-display)

- [font-display的用法](https://www.w3cplus.com/css/font-display-masses.html)
- [font-display的用法](https://segmentfault.com/a/1190000040134646)
- [Web 性能优化：使用 CSS font-display 控制字体加载和替换 ](https://www.cnblogs.com/cangqinglang/p/14692891.html)
- [Ensure text remains visible during webfont load](https://web.dev/font-display/?utm_source=lighthouse&utm_medium=devtools)


## 字体加载

- Block Period：如果未加载字体，任何试图使用它的元素都必须渲染不可见的后备字体。如果在此期间字体已成功加载，则正常使用它。
- Swap Period：如果未加载字体，任何尝试使用它的元素都必须呈现后备字体。如果在此期间字体已成功加载，则正常使用它。
- Failure Period：如果未加载字体，用户代理将其视为导致正常字体回退的失败加载。

| value / period | Block Period | Swap Period |
| --- | --- | --- |
| auto | Short(3s)/Infinite | Infinite/None |
| block | Short(3s) | Infinite | 
| swap | None | Infinite |
| fallback | Extremely Short(100ms) | Short |
| optional | Extremely Short(100ms) | None |

- [font-display](https://css-tricks.com/almanac/properties/f/font-display/)
- [Controlling Font Display Per Font-Face: the font-display descriptor](https://w3c.github.io/csswg-drafts/css-fonts-4/#font-display-desc)
- [Web 性能优化：使用 CSS font-display 控制字体加载和替换](https://zxuqian.cn/css-font-display-intro/)
- [font-display的用法](https://www.w3cplus.com/css/font-display-masses.html)
- [How We Load Web Fonts Progressively](https://www.filamentgroup.com/lab/font-events.html)
- [fontfaceobserver](https://github.com/bramstein/fontfaceobserver) - Webfont loading. Simple, small, and efficient.
