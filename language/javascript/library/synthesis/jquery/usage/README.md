- http://tool.oschina.net/apidocs/apidoc?api=jquery

## 核心
### 核心函数
...

### 对象访问

### 数据缓存
- `data([key],[value])`：在元素上存放数据

    - 第一次调用时会读取元素标签的 data 属性；
    - 动态添加的元素标签 data 属性，不会存放到数据缓存中；
    - 通过该接口设置的数据缓存不会在元素标签添加对应 data 属性；

- ...

## CSS
##＃ 位置
- `offset([coordinates])`：获取匹配元素在当前文档的相对偏移

    备注：偏移量包含滚动的不可见部分，即使是固定定位也是如此（固定定位元素的 offsetTop 和 offsetLeft 相对窗口的偏移）。

- `position()`：获取匹配元素相对父元素的偏移

    备注：只对可见元素有效

- `scrollTop([val])` / `scrollLeft([val])`：获取匹配元素相对滚动条顶部或左侧的偏移

##＃ 尺寸
区分 widht / height，innerWidth / innerHeight 和 outerWidth / outerHeight

| | Padding | Border | Margin |
| --- | --- | --- | --- |
| width / height | × | × | × |
| innerWidth / innerHeight | √ | × | × |
| outerWidth / outerHeight | √ | √ | × |
| outerWidth(true) / outerHeight(true) | √ | √ | √ |

![jquery-dimention.gif](./.attachement/jquery-dimention.gif)

测试示例：`./css/size.html`

参考文献

- [jQuery: What’s the difference between height, innerHeight and outerHeight?](http://www.texelate.co.uk/blog/post/91-jquery-whats-the-difference-between-height-innerheight-and-outerheight/)
- [What is difference between width, innerWidth and outerWidth, height, innerHeight and outerHeight in jQuery](http://stackoverflow.com/questions/17845027/what-is-difference-between-width-innerwidth-and-outerwidth-height-innerheight)
- [Working with widths and heights](http://www.jquery-tutorial.net/dimensions/working-with-widths-and-heights/)
- [jQuery - Dimensions](http://www.w3schools.com/jquery/jquery_dimensions.asp)

备注：jQuery 没有提供元素滚动区域的高度，具体参考 [How do I determine scrollHeight?](http://stackoverflow.com/questions/7381817/how-do-i-determine-scrollheight)。

## 筛选
### 过滤
- `is(expr|obj|ele|fn)`：根据选择器、DOM 元素或 jQuery 对象来检测匹配元素集合，如果其中至少有一个元素符合这个给定的表达式就返回true。

    - `$('#target').is(':visible')`：是否可见

# 事件
- [jQuery 事件处理](http://javascript.ruanyifeng.com/jquery/basic.html#toc14)

## 工具
### 函数操作
- `$.proxy(function,context)`：返回一个新函数，并且这个函数始终保持了特定的作用域

    - 当有事件处理函数要附加到元素上，但他们的作用域实际是指向另一个对象时，这个方法最有用了；
    - jQuery能够确保即便你绑定的函数是经过 `$.proxy()` 处理过的函数，你依然可以传递原先的函数来准确无误地取消绑定；

    备注：相当于 `bind`
