CSS
========

## 盒模型

- [你真的了解盒模型吗？](https://rainey.space/2016/07/02/Ni_Zhen_De_Liao_Jie_He_Mo_Xing_Ma/)
- [在CSS中所谓“标准的盒模型”有几种，IE早期的盒模型是标准盒模型吗？](https://www.zhihu.com/question/25509268/answer/30949718)
- [[译]:BFC与IFC](https://segmentfault.com/a/1190000004466536)
- [BFC与IFC概念理解+布局规则+形成方法+用处](https://segmentfault.com/a/1190000009545742)
- [小科普：到底什么是 BFC、IFC、GFC 和 FFC](https://juejin.im/entry/5938daf7a0bb9f006b2295db)
- [谈谈一些有趣的CSS题目](https://github.com/chokcoco/iCSS/issues/5)
- [浅析CSS中的BFC和IFC](https://www.cnblogs.com/Candybunny/p/6222939.html)
- [CSS魔法堂：重新认识Box Model、IFC、BFC和Collapsing margins](https://www.cnblogs.com/fsjohnhuang/p/5259121.html)

## 选择器

### 选择器优先级

- 内联样式
- ID 选择器
- 类选择器，属性选择器，伪类选择器
- 标签选择器，伪元素选择器

### 选择器分类

- 元素选择符

    - 通配选择符
    - 类型选择符
    - ID 选择符
    - 类选择符

- 关系选择符

    - 包含选择符
    - 子选择符
    - 相邻选择符
    - 兄弟选择符

- 属性选择符：包含，等于，不等于，以指定字符开始，以指定字符结束，包含该指定字符
- 伪类选择符

    - 不包含指定选择符
    - 链接状态：E:link，E:visitied，E:hover，E:active
    - 焦点状态：E:not(s)
    - 子元素：位置和数量
    - 父元素：E:empty
    - 表单：E:checked，E:enabled，E:disabled
    - 其他：E:lang(fr)，E:root，E:target

- 伪对象选择符：字符，行，前后，占位，选中

## 单位

- 长度
- 角度
- 时间
- 频率
- 布局
- 分辨率
- 颜色
- 文本
- 数字

## 函数

- 计算
- 内容
- 生成

## 属性

- 适用原色
- 可选值
- 默认值
- 继承性
- 动画性

### 定位

#### Float

> 浮动（float）是 CSS 定位属性。浮动元素从网页的正常流动中移出，但是保持了部分的流动性，会影响其他元素的定位（比如文字会围绕着浮动元素）。这一点与绝对定位不同，绝对定位的元素完全从文档流中脱离。

### 布局

#### Flexbox

> Flexbox 解决了 CSS 中的许多常见问题，例如容器中元素的垂直居中，粘性定位（sticky）的页脚等。Bootstrap 和 Bulma 基于 Flexbox，这是创建布局的推荐方式。我之前曾使用过 Flexbox，但在使用flex-grow时遇到了一些浏览器不兼容问题（Safari），我必须使用inline-blocks和手动计算百分比宽度，来重写我的代码，这种体验不是很好。

#### Grid

> Grid 创建基于栅格的布局，是迄今为止最直观的方法（最好是！），但目前浏览器支持并不广泛。

- [CSS Grid布局](http://www.w3cplus.com/blog/tags/355.html)
- [CSS Grid 系列(上)-Grid布局完整指南](https://segmentfault.com/a/1190000012889793)

## 其他

- 强制优先
- 注释
- 媒体查询
- 特性检测
- 模块引入
- 字体引入
- 帧动画

## 预处理器

### Sass

- 用法

    - 基础

        - 变量
        - 计算
        - 嵌套：选择器嵌套，属性嵌套
        - 注释：单行注释，多行注释，重要注释

    - 代码重用

        - 继承
        - Mixin
        - 颜色函数
        - 插入文件

    - 高级用法

        - 条件语句

            - @if
            - @else

        - 循环语句

            - @for
            - @while
            - @each

        - 自定义函数

            - @function

- 参考文献

    - http://sass-lang.com/
    - [Sass 中文网](https://www.sasscss.com/)
    - [SASS用法指南](http://www.ruanyifeng.com/blog/2012/06/sass.html)
    - [Sass 与 SCSS 是什么关系？](https://segmentfault.com/a/1190000005646206)
    - https://www.sassmeister.com/ / https://sass.js.org/

### 预处理器的优缺点？

- 优点：

    - 提高 CSS 可维护性。
    - 易于编写嵌套选择器。
    - 引入变量，增添主题功能。可以在不同的项目中共享主题文件。
    - 通过混合（Mixins）生成重复的 CSS。
    - 将代码分割成多个文件。不进行预处理的 CSS，虽然也可以分割成多个文件，但需要建立多个 HTTP 请求加载这些文件。

- 缺点：

    - 通过node-sass使用 Sass，它用 C ++ 编写的 LibSass 绑定。在 Node 版本切换时，我必须经常重新编译。
    - Less 中，变量名称以@作为前缀，容易与 CSS 关键字混淆，如@media、@import和@font-face。

## 框架

- > Bootstrap： 更新周期缓慢。Bootstrap 4 已经处于 alpha 版本将近两年了。添加了在页面中广泛使用的微调按钮组件。
- > Semantic UI：源代码结构使得自定义主题很难理解。非常规主题系统的使用体验很差。外部库的路径需要硬编码（hard code）配置。变量重新赋值没有 Bootstrap 设计得好。
- > Bulma： 需要很多非语义的类和标记，显得很多余。不向后兼容，以至于升级版本后，会破坏应用的正常运行。

## 问题

### 条件 Hack

```
<!--[if <keywords>? IE <version>?]>
HTML代码块
<![endif]-->
```

> IE10 及以上版本已将条件注释特性移除，使用时需注意。

### 属性级 Hack

- IE6及其以下版本支持前缀 `_`、`-`；
- IE6及其以上版本支持后缀 `\9`；
- IE7及其以上版本支持前端 `*`、`+`、`#` 和 后缀 `!important`；
- IE8及其以上版本支持后缀 `\0`；
- IE9及其以上版本支持w伪类选择符 `E:root`。

### 如何清除图片下方出现几像素的空白间隙？

- `img{display:block;}`
- `img{vertical-align:top;}`
- `#test{font-size:0;line-height:0;}`

    > #test为img的父元素

[如何解决div里面img图片下方有空白的问题？](https://jingyan.baidu.com/article/7082dc1c69dc6fe40a89bdfe.html)


### vertical-align 和 line-height 的关系？

- [深入理解CSS中的行高](http://www.cnblogs.com/rainman/archive/2011/08/05/2128068.html)
- [css行高line-height的一些深入理解及应用](http://www.zhangxinxu.com/wordpress/2009/11/css%E8%A1%8C%E9%AB%98line-height%E7%9A%84%E4%B8%80%E4%BA%9B%E6%B7%B1%E5%85%A5%E7%90%86%E8%A7%A3%E5%8F%8A%E5%BA%94%E7%94%A8/)
- [字母’x’在CSS世界中的角色和故事](http://www.zhangxinxu.com/wordpress/2015/06/about-letter-x-of-css/)
- [CSS深入理解vertical-align和line-height的基友关系](http://www.zhangxinxu.com/wordpress/2015/08/css-deep-understand-vertical-align-and-line-height/)
- [What is Vertical Align?]（https://css-tricks.com/what-is-vertical-align/
- [Vertical-Align: All You Need To Know](http://christopheraue.net/design/vertical-align)

### white-space VS word-wrap VS word-break

- [你真的了解word-wrap和word-break的区别吗？](http://www.cnblogs.com/2050/archive/2012/08/10/2632256.html)
- [white-space、word-wrap和word-break的简单整理](https://segmentfault.com/a/1190000008268387)
- [word-break:break-all和word-wrap:break-word的区别](http://www.zhangxinxu.com/wordpress/2015/11/diff-word-break-break-all-word-wrap-break-word/)

### 文本截断

- 单行单行截断
- 多行文本截断
- 按高度截断

### 如何清除浮动

TODO

### 重置 CSS VS 标准化 CSS

- > 重置（Resetting）： 重置意味着除去所有的浏览器默认样式。对于页面所有的元素，像margin、padding、font-size这些样式全部置成一样。你将必须重新定义各种元素的样式。
- > 标准化（Normalizing）： 标准化没有去掉所有的默认样式，而是保留了有用的一部分，同时还纠正了一些常见错误。

> 当需要实现非常个性化的网页设计时，我会选择重置的方式，因为我要写很多自定义的样式以满足设计需求，这时候就不再需要标准化的默认样式了。

### 垂直居中

- [CSS居中完整指南](https://www.w3cplus.com/css/centering-css-complete-guide.html)

### 固定底部

- [CSS粘住固定底部的5种方法](http://caibaojian.com/css-5-ways-sticky-footer.html)

## 性能

TODO

## 规范

- [css-modules](https://github.com/css-modules/css-modules) / [CSS Modules 用法教程](http://www.ruanyifeng.com/blog/2016/06/css_modules.html)
- BEM
- SUITCSS
- SMACSS
- OOCSS

## 参考文献

- 谈谈一些有趣的CSS题目

    - [谈谈一些有趣的CSS题目（1~5） ](https://github.com/chokcoco/iCSS/issues/1)
    - [谈谈一些有趣的CSS题目（6~10）](https://github.com/chokcoco/iCSS/issues/2)
    - [谈谈一些有趣的CSS题目（11~15）](https://github.com/chokcoco/iCSS/issues/5)
    - [谈谈一些有趣的CSS题目（16）-- 你该知道的字体 font-family](https://github.com/chokcoco/iCSS/issues/6)
    - [谈谈一些有趣的CSS题目（17）-- 再探究字体的渲染规则及fallback机制](https://github.com/chokcoco/iCSS/issues/7)
    - [谈谈一些有趣的CSS题目（18）-- 使用 position:sticky 实现粘性布局](https://github.com/chokcoco/iCSS/issues/8)
    - [谈谈一些有趣的CSS题目（19）-- 深入探讨 CSS 特性检测](https://github.com/chokcoco/iCSS/issues/9)
    - [谈谈一些有趣的CSS题目（20）-- 巧妙地制作背景色渐变动画！](https://github.com/chokcoco/iCSS/issues/10)
    - [谈谈一些有趣的CSS题目（21）-- 提高 CSS 动画性能的正确姿势 | 盒子端 CSS 动画性能提升研究](https://github.com/chokcoco/iCSS/issues/11)
    - [谈谈一些有趣的CSS题目（22）-- 纯 CSS 方式实现 CSS 动画的暂停与播放](https://github.com/chokcoco/iCSS/issues/12)
    - [谈谈一些有趣的CSS题目（23）-- 谈谈 CSS 关键字 initial、inherit 和 unset](https://github.com/chokcoco/iCSS/issues/13)
    - [谈谈一些有趣的CSS题目（25）-- vh、vw、vmin、vmax 知多少](https://github.com/chokcoco/iCSS/issues/15)
    - [谈谈一些有趣的CSS题目（26）-- 奇妙的-webkit-background-clip: text](https://github.com/chokcoco/iCSS/issues/14)
    - [谈谈一些有趣的CSS题目（27）-- 神奇的 conic-gradient 圆锥渐变](https://github.com/chokcoco/iCSS/issues/19)
    - [谈谈一些有趣的CSS题目（28）-- 不可思议的颜色混合模式 mix-blend-mode](https://github.com/chokcoco/iCSS/issues/16)
    - [谈谈一些有趣的CSS题目（29）-- text-fill-color 与 color 的异同](https://github.com/chokcoco/iCSS/issues/17)
    - [谈谈一些有趣的CSS题目（30）-- 奇妙的 CSS shapes(CSS图形)](https://github.com/chokcoco/iCSS/issues/18)
    - [谈谈一些有趣的CSS题目（31）-- 纯 CSS 实现波浪效果](https://github.com/chokcoco/iCSS/issues/22)
