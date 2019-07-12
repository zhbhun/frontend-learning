- 优先使用排在前面的字体。
- 如果找不到该种字体，或者该种字体不包括所要渲染的文字，则使用下一种字体。
- 如果所列出的字体，都无法满足需要，则让操作系统自行决定使用哪种字体。

总几个：font-family 应该优先指定英文字体，然后再指定中文字体。否则，中文字体所包含的英文字母，会取代英文字体。

# 衬线体 | 无衬线体 | 等宽字体
- Serif：衬线体，笔画的末端带有衬线的字体；
- Sans-Serif：无衬线体，笔画的末端没有衬线的字体；
- Monospaced：等宽字体

总结：一般来说，衬线体装饰性强，往往用于标题；无衬线体清晰度好，往往用于正文。

# 系统预装字体
## Windows
- 黑体：SimHei，无衬线体

    Windows XP 没有预装 “微软雅黑”，这时可以选择黑体（Simhei）替代。不过，黑体比较粗，不应用于字号较小的文字。

- 微软雅黑：Microsoft YaHei，无衬线体

    Windows 7 开始提供，美观度和清晰度都较好，可以作为网页的首选字体。在 Mac 平台的对应字体是华文细黑（STXihei）

- 宋体：SimSun，衬线体

    如果没有指定字体，操作系统往往选择它来渲染。

- 新宋体：NSimSun，衬线体
- 仿宋：FangSong，衬线体

    比宋体的装饰性更强。如果字号太小，会影响清晰度，所以只有在字号大于14px的情况下，才可以考虑这种字体。在 Mac 平台的对应字体是"华文仿宋"（STFangsong）。

- 楷体：KaiTi，衬线体

    装饰性与仿宋体接近，但是宽度更大，笔画更清楚一些。这种字体也不应该在小于14px的情况下使用。在 Mac 平台的对应字体是"华文楷体"（STKaiti）。

- Arial：Win 平台上默认的无衬线西文字体
- Tahoma：十分常见的无衬线字体，被采用为Windows 2000、Windows XP、Windows Server 2003及Sega游戏主机Dreamcast等系统的预设字型，显示效果比Arial要好。
- Verdana：无衬线字体，优点在于它在小字上仍结构清晰端整、阅读辨识容易。

## OS X
- 华文细黑：STHeiti Light （又名STXihei）

    OS X 10.6 之前的简体中文系统界面默认字体，也是目前Chrome游览器下的默认字体，有 Regular 和 Bold 两个字重。

- 华文黑体：STHeiti
- 华文楷体：STKaiti
- 华文宋体：STSong
- 华文仿宋：STFangsong
- 黑体-简：Heiti SC

    从 10.6 开始，黑体-简代替华文黑体用作简体中文系统界面默认字体，苹果生态最常用的字体之一，包括iPhone、iPad等设备用的也是这款字体，显示效果不错，但是喇叭口设计遭人诟病。

- 冬青黑体: Hiragino Sans GB 

    SNOW LEOPARD 开始提供，又叫苹果丽黑，日文字体 Hiragino KakuGothic 的简体中文版，简体中文有 常规体 和 粗体 两种，冬青黑体是一款清新的专业印刷字体，小字号时足够清晰，拥有很多人的追捧。

- 苹方（PingFang SC）：
    
    在 Mac OS X EL Capitan上，苹果为中国用户打造了一款全新中文字体--苹方，去掉了为人诟病的喇叭口，整体造型看上去更加简洁，字族共六枚字体：极细体、纤细体、细体、常规体、中黑体、中粗体。

- Times New Roman

    Mac平台Safari下默认的字体，是最常见且广为人知的西文衬线字体之一，众多网页浏览器和文字处理软件都是用它作为默认字体。

- Helvetica、Helvetica Neue：

    一种被广泛使用的传奇般的西文字体（这货还有专门的记录片呢），在微软使用山寨货的 Arial 时，乔布斯却花费重金获得了 Helvetica 苹果系统上的使用权，因此该字体也一直伴随着苹果用户，是苹果生态中最常用的西文字体。Helvetica Neue 为 Helvetica 的改善版本，且增加了更多不同粗细与宽度的字形，共拥有51种字体版本，极大的满足了日常的使用。

- San Francisco
    
    同样是 Mac OS X EL Capitan 上最新发布的西文字体，感觉和Helvetica看上去差别不大，目前已经应用在Mac OS 10.11+、iOS 9.0+、watch OS等最新系统上。

## MicroSoft Office

- 隶书：LiSu
- 幼圆：YouYuan
- 华文细黑：STXihei
- 华文楷体：STKaiti
- 华文宋体：STSong
- 华文中宋：STZhongsong
- 华文仿宋：STFangsong
- 方正舒体：FZShuTi
- 方正姚体：FZYaoti
- 华文彩云：STCaiyun
- 华文琥珀：STHupo
- 华文隶书：STLiti
- 华文行楷：STXingkai
- 华文新魏：STXinwei

## Android

- Droid Sans：卓系统中默认的西文字体，是一款人文主义无衬线字体
- Droid Sans Fallback：包含汉字、日文假名、韩文的文字扩展支持

## Linux

- 文泉驿点阵宋体：类似宋体的衬线字体，一般不推荐使用。
- 文泉驿微米黑：几乎是 Linux 社区现有的最佳简体中文字体。

# 实际应用
- font-family: "San Francisco", "Helvetica Neue", Helvetica, "Droid Sans", Tahoma, Arial, "PingFang SC", "Hiragino Sans GB", "Heiti SC", STXihei, "Droid Sans Fallback", "Microsoft YaHei", SimHei, "WenQuanYi Micro Hei", sans-serif;

# 其他
- https://github.com/aui/font-spider
- https://github.com/zenozeng/fonts.css
- https://github.com/sofish/typo.css

# 参考文献
- [中文字体网页开发指南](http://www.ruanyifeng.com/blog/2014/07/chinese_fonts.html)
- [Chinese Standard Web Fonts: A Guide to CSS Font Family Declarations for Web Design in Simplified Chinese](http://www.kendraschaefer.com/2012/06/chinese-standard-web-fonts-the-ultimate-guide-to-css-font-family-declarations-for-web-design-in-simplified-chinese/)
- [如何优雅的选择字体(font-family)](https://segmentfault.com/a/1190000006110417)
- [如何保证网页的字体在各平台都尽量显示为最高质量的黑体？](https://www.zhihu.com/question/19911793)
- [Web 中文字体应用指南](https://ruby-china.org/topics/14005)

---

- [A Book Apart, Webfont Handbook](https://abookapart.com/products/webfont-handbook)
- [WOFF 2.0 – 了解有关下一代Web字体格式的更多信息，并将TTF转换为WOFF2](https://gist.github.com/sergejmueller/cf6b4f2133bcb3e2f64a)
- [创建你自己的@ font-face Kits » Font Squirrel](https://www.fontsquirrel.com/tools/webfont-generator)
- [ IcoMoon App - Icon Font, SVG, PDF & PNG Generator](https://icomoon.io/app/)
- [Using @font-face | CSS-Tricks](https://css-tricks.com/snippets/css/using-font-face/?ref=frontendchecklist)
- [Can I use... WOFF2](https://caniuse.com/#feat=woff2)
- [Faster Google Fonts with Preconnect - CDN Planet](https://www.cdnplanet.com/blog/faster-google-webfonts-preconnect/)
- [ Make Your Site Faster with Preconnect Hints | Viget](https://www.viget.com/articles/make-your-site-faster-with-preconnect-hints/)
- [ A Comprehensive Guide to Font Loading Strategies—zachleat.com](https://www.zachleat.com/web/comprehensive-webfonts/#font-face)
- [typekit/webfontloader: Web Font Loader gives you added control when using linked fonts via @font-face.](https://github.com/typekit/webfontloader)
