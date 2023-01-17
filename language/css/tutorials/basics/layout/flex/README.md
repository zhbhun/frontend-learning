# flexbox

## 历史

- flex：2012 至今

    - https://www.w3.org/TR/2016/CR-css-flexbox-1-20160526/
    - https://www.w3.org/TR/2016/CR-css-flexbox-1-20160301/
    - https://www.w3.org/TR/2015/WD-css-flexbox-1-20150514/
    - https://www.w3.org/TR/2014/WD-css-flexbox-1-20140925/
    - https://www.w3.org/TR/2014/WD-css-flexbox-1-20140325/
    - https://www.w3.org/TR/2012/CR-css3-flexbox-20120918/
    - https://www.w3.org/TR/2012/WD-css3-flexbox-20120612/

- flexbox：2011 至 2012 

    - https://www.w3.org/TR/2012/WD-css3-flexbox-20120322/
    - https://www.w3.org/TR/2011/WD-css3-flexbox-20111129/
    - https://www.w3.org/TR/2011/WD-css3-flexbox-20110322/

- box：2009 至 2011 

    - https://www.w3.org/TR/2009/WD-css3-flexbox-20090723/


参考 [css-flexbox](https://drafts.csswg.org/css-flexbox/)

## 概念

- flex container - 容器
- flex item - 项目
- main axis / start / end / size - 主轴 / 主轴开始位置 / 主轴结束位置 / 主轴空间
- cross axis / start / end/ size - 交叉轴 / 交叉轴开始位置 / 交叉轴结束位置 / 交叉轴空间

## 用法

### 容器属性

- flex-direction：决定主轴的方向，即项目的排列方向

    - row（默认值）：主轴为水平方向，起点在左端；
    - row-reverse：主轴为水平方向，起点在右端；
    - column：主轴为垂直方向，起点在上沿；
    - column-reverse：主轴为垂直方向，起点在下沿；

- flex-wrap：决定如何换行

    - nowrap（默认）：不换行；
    - wrap：换行，第一行在上方；
    - wrap-reverse：换行，第一行在下方；

- flex-flow：flex-direction 和 flex-wrap 属性的简写形式，，默认值为 row nowrap
- justify-content：在主轴上的对齐方式

    - flex-start（默认值）：左对齐
    - flex-end：右对齐
    - center：居中
    - space-between：两端对齐，项目之间的间隔都相等
    - space-around：每个项目两侧的间隔相等，**项目之间的间隔比项目与边框的间隔大一倍**

- align-items：交叉轴上的对齐方式

    - flex-start：交叉轴的起点对齐
    - flex-end：交叉轴的终点对齐
    - center：交叉轴的中点对齐
    - baseline: **项目的第一行文字的基线对齐**
    - stretch（默认值）：如果项目未设置高度或设为auto，将占满整个容器的高度

- align-content：多根轴线的对齐方式，如果项目只有一根轴线，该属性不起作用

    **多根轴线是指在主轴上出现了换行，align-content 决定了这些行交叉轴上的对齐方式**

    - flex-start：与交叉轴的起点对齐
    - flex-end：与交叉轴的终点对齐
    - center：与交叉轴的中点对齐
    - space-between：与交叉轴两端对齐，轴线之间的间隔平均分布
    - space-around：每根轴线两侧的间隔都相等。所以，轴线之间的间隔比轴线与边框的间隔大一倍
    - stretch（默认值）：轴线占满整个交叉轴

- gap

    [在 Flex 布局中使用 gap 属性](https://yogwang.site/2021/CSS-use-gap-in-flex-layout/)

### 项目属性

- order：定义项目的排列顺序，数值越小，排列越靠前，默认为 0
- flex-grow：定义项目的放大比例，默认为 0，即如果存在剩余空间，也不放大
- flex-shrink：定义了项目的缩小比例，默认为 1，即如果空间不足，该项目将缩小
- flex-basis：定义了在分配多余空间之前，项目占据的主轴空间
- flex：是 flex-grow, flex-shrink 和 flex-basis的简写，默认值为 0 1 auto

    - auto 等价于 1 1 auto
    - none 等价于 0 0 auto

- align-self：允许单个项目有与其他项目不一样的对齐方式，可覆盖容器 align-items 属性，默认值为 auto，表示表示继承容器的 align-items 属性

## 兼容性

- [Can I Use Flexbox](http://caniuse.com/#feat=flexbox)

## 实际应用

- 骰子的布局 - 参考 [dice](./application/dice.html)
- 网格布局
- 圣杯布局 - 参考 [holy-grail](./application/holy-grail.html)
- 表单布局

    - 在输入框的前方添加提示，后方添加按钮

- 悬挂式布局

    - 主栏的左侧或右侧添加一个图片栏

- 固定的底栏

    有时，页面内容太少，无法占满一屏的高度，底栏就会抬高到页面的中间。这时可以采用Flex布局，让底栏总是出现在页面的底部。

- 流式布局

    每行的项目数固定，会自动分行

## 性能优化

- [Flexbox - flex direction column slow layout performance](https://bugs.webkit.org/show_bug.cgi?id=150445)
- [Update flexbox to Blink's tip of tree](https://bugs.webkit.org/show_bug.cgi?id=168657)
- [Does Flexbox Have a Performance Problem?](https://css-tricks.com/does-flexbox-have-a-performance-problem/)
- [Flexbox layout isn't slow](https://developers.google.com/web/updates/2013/10/Flexbox-layout-isn-t-slow)

## 开源项目

- [bulma](https://github.com/jgthms/bulma) - Modern CSS framework based on Flexbox.
- [solved-by-flexbox](https://github.com/philipwalton/solved-by-flexbox)- A showcase of problems once hard or impossible to solve with CSS alone, now made trivially easy with Flexbox.
- [flexboxgrid](https://github.com/kristoferjoseph/flexboxgrid) - Grid based on CSS3 flexbox
- [flexbox-patterns](https://github.com/cjcenizal/flexbox-patterns) - Patterns for using flexbox CSS to build awesome UI components.
- [mastastealth/sass-flex-mixin](https://github.com/mastastealth/sass-flex-mixin)
- [flex-layout-attribute](https://github.com/StefanKovac/flex-layout-attribute)
- [Juiced](https://github.com/ovdojoey/Juiced) - A Flexbox CSS Framework
- [flexgrid](https://github.com/ptb/flexgrid)
- [reflex](https://github.com/leejordan/reflex) - responsive flexbox grid with inline-block legacy support
- [flexbox-grid](https://github.com/zemirco/flexbox-grid) - Grid system using CSS flex properties
- [kenwheeler/structure](https://github.com/kenwheeler/structure) - 
- [gridilydidily](https://github.com/philippkuehn/gridilydidily) - A highly configurable, data-attribute driven and sass based flexbox grid with inline-block fallback.
- [bem-grid](https://github.com/bem-contrib/bem-grid) - Flexbox grid for bem-projects
- [flex-layout](https://github.com/Coffcer/flex-layout) - 基于flexbox的栅格化布局库，提供更直观、丰富的布局方式。
- [Flexbox.less](https://github.com/ProLoser/Flexbox.less) - Compass extension that includes mixins for the official flexbox specification, along with fallbacks for older implementations.
- [basis](https://github.com/sass-basis/basis) - A lightweight responsive CSS framework based on flexible box ( flexbox )
- [s-grid](https://github.com/juliancwirko/s-grid) - Flexbox grid system for Stylus
- [What-The-Flexbox](https://github.com/wesbos/What-The-Flexbox) - Exercises for the What The Flexbox video series - available at Flexbox.io
- [Flexbox-Framework](https://github.com/fclaussen/Flexbox-Framework) - A simple and effective flexbox based framework.
- [sass-flexbox-mixin](https://github.com/ultimatedelman/sass-flexbox-mixin) - https://github.com/ultimatedelman/sass-flexbox-mixin
- [layout.css](https://github.com/lapwinglabs/layout.css) - Wrapper around flexbox to make doing flexbox layouts simple and declarative
- [Flexbox-Examples](https://github.com/callmenick/Flexbox-Examples) - Some layout demos built with flexbox.
- [flex-layout](https://github.com/Coffcer/flex-layout) - 基于flexbox的栅格化布局库，提供更直观、丰富的布局方式
- [flex-cheatsheet](https://github.com/yoksel/flex-cheatsheet)

## 参考文献

- [A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/#flexbox-background)
- [Flex 布局教程：语法篇](http://www.ruanyifeng.com/blog/2015/07/flex-grammar.html)
- [Flex 布局教程：实例篇](http://www.ruanyifeng.com/blog/2015/07/flex-examples.html)
- [Getting Dicey With Flexbox](https://davidwalsh.name/flexbox-dice)
- [A Complete Guide to Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [A Visual Guide to CSS3 Flexbox Properties](https://scotch.io/tutorials/a-visual-guide-to-css3-flexbox-properties)
- [W3C Plus Tag Of Flexbox](http://www.w3cplus.com/blog/tags/157.html)
- [浅谈flexbox的弹性盒子布局](http://www.alloyteam.com/2015/05/xi-shuo-flexbox-dan-xing-he-zi-bu-ju/)
- [FLEXBOX FROGGY](http://flexboxfroggy.com/)
- http://flexbox.io/
- [【前端攻略】最全面的水平垂直居中方案与flexbox布局](http://www.cnblogs.com/coco1s/p/4444383.html)
- [移动端全兼容的flexbox速成班](https://isux.tencent.com/flexbox.html)
- [CSS 属性 display 取值 box 和 flexbox 以及 flex 有什么不同，分别表示什么？](https://www.zhihu.com/question/25147729)- [11 things I learned reading the flexbox spec](https://hackernoon.com/11-things-i-learned-reading-the-flexbox-spec-5f0c799c776b)- [Are We Ready to Use Flexbox?](https://www.sitepoint.com/are-we-ready-to-use-flexbox/)
- [Knights of the Flexbox Table](https://knightsoftheflexboxtable.com/)
- [Flex Box Adventure](https://codingfantasy.com/games/flexboxadventure)
- [An Interactive Guide to Flexbox](https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/)
