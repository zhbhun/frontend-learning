溢出显示
========

- [Handling Long and Unexpected Content in CSS](https://css-tricks.com/handling-long-unexpected-content-css/)

## 文本换行

要点：

1. 区分 word-break 和 word-wrap 的作用
2. word-break 和 word-wrap 的优先级

### white-space

white-space 属性定义了如何处理文本中的空白，主要决定决定了如何处理元素内文本中空白符、换行符、是否允许过长行折行。其中，过长行是指那些单行内容宽度超出了容器宽度的行。

### word-break

设置或检索对象内文本的字内换行行为

- 适用于：块级元素（block | inline-block）
- 可用值：normal | keep-all | break-all
- 默认值：normal
- 继承性：有
- 动画性：否
- 兼容性：IE6+

用法：元素设置好宽度，然后根据需要设置 word-break

- `normal`：默认的换行规则。依据各自语言的规则，允许在字间发生换行；
- `keep-all`：对于 CJK（中文，韩文，日文）文本不允许在字符内发生换行。Non-CJK 文本表现同`normal`；
- `break-all`：对于 Non-CJK 文本允许在任意字符内发生换行。该值适合包含一些非亚洲文本的亚洲文本，比如使连续的英文字符断行；
- `break-word`：与 `break-all` 相同，不同的地方在于它要求一个没有断行破发点的词必须保持为一个整体单位。这与 `word-wrap` 的 `break-word` 值效果相同；

要点

- CJK（中文，韩文，日文）的文本规则允许在在字内换行
- 非 CJK 的文本规则不允许在字内换行
- 对于混合的文本
    
    - break-all 全换行，将非 CJK 文本当做 CJK 文本处理；
    - keep-all 不换行，将 CJK 文本当做非 CJK 处理；
    - normal 保证非亚洲语言不会在字内换行，如果剩余空间不够放置这段文本了就在新的一行显示，新的一行还是显示不下的话，就超出父容器显示，对于亚洲语言文本会直到放不下了就换行；


测试示例：[word-break.html](./word-break.html)

### word-wrap / overflow-wrap

设置或检索对象内文本的字内换行行为

- 适用于：所有元素
- 可用这：normal | break-word
- 默认值：normal
- 继承性：有
- 动画性：否

用法：元素设置好宽度，然后根据需要设置

- `word-wrap: normal`：允许内容顶开或溢出指定的容器边界；
- `word-wrap: break-word`：内容将在边界内换行，如果需要，单词内部允许断行；

要点：

- word-wrap 只作用于非亚洲语言文本，非亚洲语言文本根据 word-break 处理
- 在设置 word-wrap 为 break-word 时，非亚洲语言文本允许字内换行，如果遇到剩余空间不够放置时，会换行显示，新的一行还是显示不下的话，截断显示文本

测试示例：[word-wrap.html](./word-wrap.html)

兼容性：IE6+，CSS3 中将 word-wrap 改名为 overflow-wrap，但 IE 和 Firefox 不支持 overflow-wrap，而 Chrome，iOS7+ 和 Android 4.4+ 支持该属性。

### word-break vs word-wrap

- word-wrap = normal，word-wrap 只作用于非亚洲文本
- word-wrap = break-all，word-wrap 不起作用
- word-wrap = keep-all，word-wrap 对所有文本其作用

参考示例 [word-break-vs-word-break.html](./word-break-vs-word-break.html)

### 实际应用

默认值的情况下，非亚洲文本不会换行，亚洲文本会自动换行。

- 保证文本不换行：`word-break: keep-all`
- 保证文本换行

    - `word-break: break-all`：非亚洲语言文本当做亚洲语言文本处理，适用于 “适合包含少量亚洲文本的非亚洲文本”
    - `word-wrap：break-word`：允许非亚洲语言文本换行，适用于 “一些非亚洲文本的亚洲文本”

    总结：以上两种情况都可以实现换行，但在效果上存在细微的差别，前者完全将非亚洲文本当做亚洲文本处理了，后者在处理非亚洲文本的时候，还是当做非亚洲文本，在遇到超长文本的时候，如果剩余空间不足显示会换行处理，新的一行显示不下的话再截断换行。

### 参考文献

- [white-space、word-wrap和word-break的简单整理](https://segmentfault.com/a/1190000008268387)
- [你真的了解word-wrap和word-break的区别吗？](http://www.cnblogs.com/2050/archive/2012/08/10/2632256.html)
- [word-break:break-all和word-wrap:break-word的区别](https://www.zhangxinxu.com/wordpress/2015/11/diff-word-break-break-all-word-wrap-break-word/)

## 文本截断

**需求**

- 单行截断
- 多行截断
- 按高度截断

**误区**

- 字符一定等宽
- 超过 n 个字符截断显示，英文数字算一个字符，汉字算两个字符

备注：为了显示效果，前端往往会采用优先西文字体族的 font-family 设置，即西文字符用西文字体，汉字用中文字体，这就很容易使得文本的宽度不好根据字符数来控制。非代码的内容本身就不一定适合用等宽西文字体显示，即使用了等宽西文字体，汉字也基本不可能正好是其两倍宽

**单行单行截断**

- 基于 `text-overflow:ellipsis` 实现

    行内文本截断需要设置块级容器设置样式：`white-space: nowrap; text-overflow: ellipsis; overflow: hidden;`
    
    输入框文本截断需要设置样式：`wdith: 指定宽度; text-overflow: ellipsis;`

    存在的问题：

    - 在 IE8 和 IE9 的元素 `<input type="text">` 上不起作用；
    - 一些三星移动设备的浏览器，必须设置 text-rendering 为 auto 才能截断；
    - 在 IE 和 Chrome 的 Select 元素上不起作用 —— Firefox 可以；

- 通过计算内容宽度来实现

    计算每个字符的宽度，找到加上 ... 正好小于指定宽度的边界，然后截去后续字符。

**多行文本截断**

- 基于 line-clamp 实现：设置元素的样式为 `display: -webkit-box; overflow: hidden; -webkit-line-clamp: 2; -webkit-box-orient: vertical;`
- 计算内容行数

    - `getComputedStyle`
    - `Element.getClientRects()`
    - `Selection.modify()`
    - https://github.com/josephschmitt/Clamp.js/
    - ...

**按高度截断**

通过比较 scrollHeight 和 clientHeight 可以方便地测试元素内容的高度是否溢出容器范围，如果超出了指定高度，反复截去尾部内容直到不再溢出。

**实现案例**

- https://github.com/zhbhun/program-demo/tree/master/css/faq/text-truncation

**开发工具**
- http://www.css88.com/webkit/-webkit-line-clamp/
- https://github.com/josephschmitt/Clamp.js/

**参考文献**

- [text-overflow](http://caniuse.com/#feat=text-overflow)
- [line-clamp](http://caniuse.com/#feat=css-line-clamp)
- [前端文本截断](http://efe.baidu.com/blog/text-truncating/)
- [CSS LINE CLAMPING](http://guerillalabs.co/blog/css-line-clamping.html)
- [Line Clampin’ (Truncating Multiple Line Text)](https://css-tricks.com/line-clampin/)
- [Ellipse My Text…](https://software.intel.com/en-us/html5/hub/blogs/ellipse-my-text/)
- [CSS Ellipsis: How to Manage Multi-Line Ellipsis in Pure CSS](http://www.mobify.com/blog/multiline-ellipsis-in-pure-css/)
- [ELLIPSE MY TEXT…](http://html5hub.com/ellipse-my-text/)
- [Line Clampin’ (Truncating Multiple Line Text)](https://css-tricks.com/line-clampin/)
- [谈谈一些有趣的CSS题目（5）： 单行居中，两行居左，超过两行省略](http://web.jobbole.com/88219/)
- 案例

    - 应用商店的应用简介

### 常见问题

- [White-space:pre-wrap causes extra spacing](https://stackoverflow.com/questions/36783662/white-spacepre-wrap-causes-extra-spacing)
- 表格单元格截断问题

    - [Why doesn't CSS ellipsis work in table cell?](https://stackoverflow.com/questions/10372369/why-doesnt-css-ellipsis-work-in-table-cell)
    - [CSS text-overflow in a table cell?](https://stackoverflow.com/questions/9789723/css-text-overflow-in-a-table-cell)
