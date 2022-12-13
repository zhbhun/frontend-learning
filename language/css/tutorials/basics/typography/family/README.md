- 优先使用排在前面的字体。
- 如果找不到该种字体，或者该种字体不包括所要渲染的文字，则使用下一种字体。
- 如果所列出的字体，都无法满足需要，则让操作系统自行决定使用哪种字体。

总几个：font-family 应该优先指定英文字体，然后再指定中文字体。否则，中文字体所包含的英文字母，会取代英文字体。

## 字体格式

- [Web字体格式介绍及浏览器兼容性一览](https://www.cnblogs.com/lhb25/archive/2011/02/10/1950473.html)

## 字体类型

- serif：带衬线字体，笔画结尾有特殊的装饰线或衬线。
- sans-Serif：无衬线字体，即笔画结尾是平滑的字体。
- monospace：等宽字体，即字体中每个字宽度相同。
- fantasy：主要是那些具有特殊艺术效果的字体。
- cuisive：草书字体。这种字体有的有连笔，有的还有特殊的斜体效果。因为一般这种字体都有一点连笔效果，所以会给人一种手写的感觉。
- emoji：专门用于呈现 Emoji 表情符号的字体
- math：针对显示数学相关字符的特殊样式问题而设计的字体：支持上标和下标、跨行括号、嵌套表达式和具有不同含义的 double struck glyphs。
- fangsong：一种汉字字体，介于宋体和楷体之间。这种字体常用于某些政府文件。
- system-ui：从浏览器所处平台处获取的默认用户界面字体。

    ps：实际测试 system-ui 受 chrome 浏览器的“标准字体”影响。

- -apple-system：在一些稍低版本 Mac OS X 和 iOS 上，它针对旧版上的 Neue Helvetica 和 Lucida Grande 字体，升级使用更为合适的 San Francisco Fonts；
- BlinkMacSystemFont：针对一些 Mac OS X 上的 Chrome 浏览器，使用系统默认字体
- "Segoe UI"，在 Windows 及 Windows Phone 上选取系统默认字体；
- ui-serif, ui-sans-serif, ui-monospace, ui-rounded

    对比 serif 等，带 ui 前缀的字体可以使用系统设置，目前只有 safari 支持，其他浏览器效果等同于 system-ui。

总结：一般来说，衬线体装饰性强，往往用于标题；无衬线体清晰度好，往往用于正文。

- [Generic font families](https://w3c.github.io/csswg-drafts/css-fonts-4/#generic-font-families)
- [谈谈一些有趣的CSS题目（16）-- 你该知道的字体 font-family ](https://www.cnblogs.com/coco1s/p/11350642.html)
- [Web 字体 font-family 再探秘](https://www.cnblogs.com/coco1s/p/11350642.html)
- [Using UI System Fonts In Web Design: A Quick Practical Guide](https://www.smashingmagazine.com/2015/11/using-system-ui-fonts-practical-guide/)
- [font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif ](https://github.com/necolas/normalize.css/issues/665)
- [ui-serif, ui-sans-serif, ui-monospace and ui-rounded values for font-family - caniuse](https://caniuse.com/extended-system-fonts)
- [[前端基础]font-family 详解](https://juejin.cn/post/7025161032435761189)

## 安全字体

网页安全字体（web safe fonts）：就是基本上能保证所有用户看见的是类似的字体，也就是说他们的操作系统里以很大概率自带了这些字体。

### 常见的安全字体

- Arial (sans-serif)：

    - 简介：Win 平台上默认的无衬线西文字体
    - 族科：Arial, “Helvetica Neue”, Helvetica
    
    ps：Helvetica 是一种被广泛使用的传奇般的西文字体（这货还有专门的记录片呢），在微软使用山寨货的 Arial 时，乔布斯却花费重金获得了 Helvetica 苹果系统上的使用权，因此该字体也一直伴随着苹果用户，是苹果生态中最常用的西文字体。Helvetica Neue 为 Helvetica 的改善版本，且增加了更多不同粗细与宽度的字形，共拥有51种字体版本，极大的满足了日常的使用。

- Verdana (sans-serif)

    - 简介：一套无衬线字体，由于它在小字上仍有结构清晰端整、阅读辨识容易等高品质的表现，因而在 1996 年推出后即迅速成为许多领域所爱用的标准字型之一。
    - 族科: Verdana, Geneva;
    
    ps：此字体的设计源起于微软字型设计小组的维吉尼亚·惠烈（Virginia Howlett）希望设计一套具有高辨识性、易读性的新字型以供屏幕显示之用，于是她邀请了世界字型设计师之一的马修·卡特（Matthew Carter）操刀，以 Frutiger 字体及爱德华·约翰斯顿（Edward Johnston）为伦敦地铁所设计的字体为蓝本，并由 Monotype 公司的字型微调（Hint）专家汤姆·瑞克纳（Tom Rickner）担任手工微调，字体结构与 Tahoma（同为马修·卡特所设计）很相似，微软将 Verdana 纳入网页核心字体之一。

- Tahoma (sans-serif)

    - 简介：一个十分常见的无衬线字体，字体结构和 Verdana 很相似，其字符间距较小，而且对 Unicode 字集的支持范围较大。被采用为 Windows 2000、Windows XP、Windows Server 2003 及 Sega 游戏主机 Dreamcast 等系统的预设字型，显示效果比 Arial 要好。
    - 族科: Tahoma, Verdana, Segoe;
    
    ps：Tahoma 和 Verdana 师出同门，同为名设计师马修·卡特（Matthew Carter）的作品，由微软在 1994 年推出。许多不喜欢 Arial 字体的人常常会改用 Tahoma 来代替，除了是因为 Tahoma 很容易取得之外，也是因为 Tahoma 没有一些 Arial 为人诟病的缺点，例如大写”I“与小写”l“难以分辨等。

- Trebuchet MS (sans-serif)
- Times New Roman (serif)

    - 简介：可能是最常见且广为人知的衬线字体之一，在字体设计上属于过渡型衬线体，对后来的字型产生了很深远的影响。另外由于其中规中矩、四平八稳的经典外观，所以经常被选择为标准字体之一。
    - 族科: TimesNewRoman, “Times New Roman”, Times, Baskerville, Georgia;

- Georgia (serif)

    - 简介：Georgia 是一种衬线字体，为著名字型设计师马修·卡特（Matthew Carter）于 1993 年为微软所设计的作品，具有在小字下仍能清晰辨识的特性，可读性十分优良。其命名发想自一份小报报道在美国佐治亚州发现外星人头颅的测试性头条。
    - 族科: Georgia, Times, “Times New Roman”;
    
    ps：乍看之下，Georgia 与 Times New Roman 相当类似，但它们有多处不同。首先，在相同的字号下，Georgia 的字符比 Times New Roman 的字符略大；其次，Georgia 的字符线条较粗，衬线部份也比较钝而平。另外在数字部份也非常不同，Georgia采用称为”不齐线数字“的数字，特色在于数字会像英文字母般有高矮大小之别。微软将 Georgia 列入网页核心字型，是视窗操作系统的内建字型之一。苹果电脑的麦金塔系统之后也跟进采用Georgia作为内建字型之一。

    请注意：数字“0″与字母“o”在Georgia字体下可能是显示成一模一样，使用时需特别注意。

- Garamond (serif)
- Courier New (monospace)

    - 简介：Courier 是一个等宽字体的粗衬线字体，主要是依据打字机所打印出来的字形来设计，于 1955 年由 Howard “Bud” Kettler 设计完成。原来的 Courier 字体是 IBM 公司在 1950 年代设计给打印机使用的字体，但是并未维护他们的专利，使得这个字型成为整个打字机制造业的标准。
    - 族科: “Courier New”, Courier, “Lucida Sans Typewriter”, “Lucida Typewriter”;
    
    ps：在现今的电子时代，此字体也常被使用，因为其等宽的特性可以轻易地对齐字段的左右边界，也成为脚本和程式设计中源代码的常用字体。12pt 的Courier New 字体曾是美国国务院的公文标准字体，但于 2004 年 1 月停用，改使用 14pt 的 Times New Roman，因为其具”现代性”和”易读性”。

- Brush Script MT (cursive)

### 跨平台中文字体

- 黑体：

    ```css
    body {
        font-family: -apple-system, "Noto Sans", "Helvetica Neue", Helvetica, "Nimbus Sans L", Arial, "Liberation Sans", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN", "Microsoft YaHei", "Wenquanyi Micro Hei", "WenQuanYi Zen Hei", "ST Heiti", SimHei, "WenQuanYi Zen Hei Sharp", sans-serif;
    }
    ```

    - San Francisco
    
        同样是 Mac OS X EL Capitan 上最新发布的西文字体，感觉和 Helvetica 看上去差别不大，目前已经应用在 Mac OS 10.11+、iOS 9.0+、watch OS 等最新系统上。

    - "PingFang SC"：

        在 Mac OS X EL Capitan上，苹果为中国用户打造了一款全新中文字体--苹方，去掉了为人诟病的喇叭口，整体造型看上去更加简洁，字族共六枚字体：极细体、纤细体、细体、常规体、中黑体、中粗体。

    - "Hiragino Sans GB"：冬青黑

        SNOW LEOPARD 开始提供，又叫苹果丽黑，日文字体 Hiragino KakuGothic 的简体中文版，简体中文有 常规体 和 粗体 两种，冬青黑体是一款清新的专业印刷字体，小字号时足够清晰，拥有很多人的追捧。

    - "Noto Sans CJK SC", "Source Han Sans SC", "Source Han Sans CN"：思源黑体
    - "Microsoft YaHei"：微软雅黑

        Windows 7 开始提供，美观度和清晰度都较好，可以作为网页的首选字体，在 Mac 平台的对应字体是华文细黑（STXihei）。

    - "Wenquanyi Micro Hei"：文泉驿微米黑

        几乎是 Linux 社区现有的最佳简体中文字体。

    - "Heiti SC"：黑体-简

        从 10.6 开始，黑体-简代替华文黑体用作简体中文系统界面默认字体，苹果生态最常用的字体之一，包括 iPhone、iPad 等设备用的也是这款字体，显示效果不错，但是喇叭口设计遭人诟病。

    - "ST Heiti"：华文黑体
    - "ST Heiti Light"（又名STXihei）：华为细黑

        OS X 10.6 之前的简体中文系统界面默认字体。

    - "SimHei"：中易黑体

        Windows XP 没有预装 “微软雅黑”，这时可以选择黑体（Simhei）替代。不过，黑体比较粗，不应用于字号较小的文字。

    - "WenQuanYi Zen Hei Sharp"：文泉驿点阵正黑

        类似宋体的衬线字体，一般不推荐使用。

    - Droid Sans：卓系统中默认的西文字体，是一款人文主义无衬线字体
    - Droid Sans Fallback：包含汉字、日文假名、韩文的文字扩展支持

- 楷体：

    ```css
    body {
        font-family: Baskerville, Georgia, "Liberation Serif", "Kaiti SC", STKaiti, "AR PL UKai CN", "AR PL UKai HK", "AR PL UKai TW", "AR PL UKai TW MBE", "AR PL KaitiM GB", KaiTi, KaiTi_GB2312, DFKai-SB, "TW\-Kai", serif;
    }
    ```

    - STKaiti： 华文楷体
    - AR PL KaitiM GB：文鼎ＰＬ简中楷
    - KaiTi, KaiTi_GB2312：楷体

        装饰性与仿宋体接近，但是宽度更大，笔画更清楚一些。这种字体也不应该在小于14px的情况下使用。在 Mac 平台的对应字体是"华文楷体"（STKaiti）。

    - DFKai-SB：標楷體
    - "TW\-Kai"：全字库正楷体

- 宋体：

    ```css
    body {
        font-family: Georgia, "Nimbus Roman No9 L", "Songti SC", "Noto Serif CJK SC", "Source Han Serif SC", "Source Han Serif CN", STSong, "AR PL New Sung", "AR PL SungtiL GB", NSimSun, SimSun, "TW\-Sung", "WenQuanYi Bitmap Song", "AR PL UMing CN", "AR PL UMing HK", "AR PL UMing TW", "AR PL UMing TW MBE", PMingLiU, MingLiU, serif;
    }
    ```

    - "Noto Serif CJK SC", "Source Han Serif SC", "Source Han Serif CN"：思源宋体
    - STSong：华文宋体
    - "AR PL SungtiL GB"：文鼎ＰＬ简报宋
    - NSimSun：新宋体
    - SimSun：中易宋体

        如果没有指定字体，操作系统往往选择它来渲染。

    - "TW\-Sung"：全字库正宋体
    - "WenQuanYi Bitmap Song"：文泉驿点阵宋
    - "PMingLiU"：新细明体
    - MingLiU：细明体

- 仿宋：

    ```css
    body {
        font-family: Baskerville, "Times New Roman", "Liberation Serif", STFangsong, FangSong, FangSong_GB2312, "CWTEX\-F", serif;;
    }
    ```

    - STFangsong：华文仿宋
    - FangSong, FangSong_GB2312：仿宋

        比宋体的装饰性更强。如果字号太小，会影响清晰度，所以只有在字号大于14px的情况下，才可以考虑这种字体。在 Mac 平台的对应字体是"华文仿宋"（STFangsong）。

    - "CWTEX\-F"：CWTEX仿宋体

注意事项

1. 中文字体也有英文名称：宋体、微软雅黑、华文细黑这样的字体名称，只是字体的显示名称，而不是字体文件的名称。虽然说在大多数情况下直接使用显示名称也有效，但有些用户却工作在一些很极端的情况下，这会导致你的字体声明无效。

    ps：用户安装了中文版的操作系统，但却切换到了以英文为主要语言。这时候，操作系统很有可能无法按照显示名称找到正确的字体。所以我们要记住的第一件事情就是： 同时声明中文字体的字体名称（英文）和显示名称（中文）。

2. 永远不要忘记声明英文字体，并且英文字体应该在中文字体之前

    ps：绝大部分中文字体里包含英文字母（但是基本上都很丑），而英文字体里不包含中文字符。

3. 兼顾不同的操作系统
4. 确保向下兼容


参考文献

- [中文字体网页开发指南](http://www.ruanyifeng.com/blog/2014/07/chinese_fonts.html)
- [Fonts.css -- 跨平台中文字体解决方案](https://zenozeng.github.io/fonts.css/)
- [Fonts.css -- 跨平台中文字体解决方案](https://github.com/zenozeng/fonts.css/)
- [Web 中文字体应用指南](https://ruby-china.org/topics/14005)
- [跨平台字体效果浅析](https://www.woshipm.com/ucd/25682.html)

### 最佳实践

- css-tricks：`Blanco,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol`
- github: `-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"`
- ant design：`-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Noto Sans',sans-serif,'Apple Color Emoji','Segoe UI Emoji','Segoe UI Symbol','Noto Color Emoji'`

### 参考文献

- [A complete collection of web safe CSS font stacks](https://www.cssfontstack.com/)
- [Best Web Safe Fonts for HTML and CSS](https://www.w3schools.com/cssref/css_websafe_fonts.php)
- [Safe web fonts](https://web.mit.edu/jmorzins/www/fonts.html)
- [Common fonts to all versions of Windows & Mac equivalents](https://www.ampsoft.net/webdesign-l/WindowsMacFonts.html)
- [网页设计中最常见的30款英文字体](http://www.lanlanwork.com/blog/?post=1657)
- [Windows 11 font list](https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list)
- [macOS Preinstalled Fonts](https://developer.apple.com/fonts/system-fonts/#preinstalled)

## 加载机制

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
- [Controlling Font Performance with font-display](https://developer.chrome.com/blog/font-display/)
- [Controlling Font Display Per Font-Face: the font-display descriptor](https://w3c.github.io/csswg-drafts/css-fonts-4/#font-display-desc)
- [Web 性能优化：使用 CSS font-display 控制字体加载和替换](https://zxuqian.cn/css-font-display-intro/)
- [font-display的用法](https://www.w3cplus.com/css/font-display-masses.html)
- [How We Load Web Fonts Progressively](https://www.filamentgroup.com/lab/font-events.html)
- [fontfaceobserver](https://github.com/bramstein/fontfaceobserver) - Webfont loading. Simple, small, and efficient.
- [font-display的用法](https://www.w3cplus.com/css/font-display-masses.html)
- [font-display的用法](https://segmentfault.com/a/1190000040134646)
- [Web 性能优化：使用 CSS font-display 控制字体加载和替换 ](https://www.cnblogs.com/cangqinglang/p/14692891.html)
- [Ensure text remains visible during webfont load](https://web.dev/font-display/?utm_source=lighthouse&utm_medium=devtools)

## unicode-range


unicode-range是一个CSS属性，一般和 @font-face 规则一起使用，用于控制特定字符使用特定字体。

```css
@font-face {
  font-family: quote;
  src: local('SimSun');    
  unicode-range: U+201c, U+201d;
}
```

值和语法：

```css
unicode-range: U+26;               /* 单个字符编码 */
unicode-range: U+0-7F;
unicode-range: U+0025-00FF;        /* 字符编码区间 */
unicode-range: U+4??;              /* 通配符区间 */
unicode-range: U+0025-00FF, U+4??; /* 多个值 */
```

常用 unicode 值

- 汉字：[0x4e00,0x9fa5]（或十进制[19968,40869]）
- 数字：[0x30,0x39]（或十进制[48, 57]）
- 小写字母：[0x61,0x7a]（或十进制[97, 122]）
- 大写字母：[0x41,0x5a]（或十进制[65, 90]）



[CSS unicode-range特定字符使用font-face自定义字体](https://www.zhangxinxu.com/wordpress/2016/11/css-unicode-range-character-font-face/)


## 字体资源

- [Google Font](https://github.com/google/fonts)
- [Adobe Font](https://fonts.adobe.com/fonts)
- [fonts.com](https://www.fonts.com/)

## 其他

- https://github.com/aui/font-spider
- https://github.com/sofish/typo.css

## 参考文献

- [Chinese Standard Web Fonts: A Guide to CSS Font Family Declarations for Web Design in Simplified Chinese](http://www.kendraschaefer.com/2012/06/chinese-standard-web-fonts-the-ultimate-guide-to-css-font-family-declarations-for-web-design-in-simplified-chinese/)
- [如何优雅的选择字体(font-family)](https://segmentfault.com/a/1190000006110417)
- [如何保证网页的字体在各平台都尽量显示为最高质量的黑体？](https://www.zhihu.com/question/19911793)
- [Web 中文字体应用指南](https://ruby-china.org/topics/14005)


## TODO

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

---

- [ttf2woff2](https://github.com/nfroidure/ttf2woff2)
- [TTF、TOF、WOFF 和 WOFF2 的相关概念](https://www.jianshu.com/p/20619da71752)
- [Web 字体简介: TTF, OTF, WOFF, EOT & SVG](https://zhuanlan.zhihu.com/p/28179203)
- [移动Web开发字体格式选择（附.woff\.woff2 兼容性）](https://codeantenna.com/a/G8XwMvPz77)
- [了解woff2字体及转换](https://www.zhangxinxu.com/wordpress/2018/07/known-woff2-mime-convert/)
- [网页中用什么格式的字体 eof/svg/ttf/woff/woff2 ？](https://www.jianshu.com/p/65e30df6824d)
