# 用法
## 简单应用
jQuery 提供一系列方法，允许直接为常见事件绑定回调函数。比如，click 方法可以为一个元素绑定 click 事件的回调函数。

用法示例

- `$('li').click(function (e) {console.log($(this).text());});`：绑定点击事件处理程序
- `$('li').click()`：触发点击事件，虽然会执行事件处理程序，但是不会引发浏览器对该事件的默认行为

事件方法

- 表单

    - blur([[data],fn])
    - change([[data],fn])
    - focus([[data],fn])
    - focusin([data],fn)
    - focusout([data],fn)
    - submit([[data],fn])

- 鼠标

    - click([[data],fn])
    - dblclick([[data],fn])
    - mousedown([[data],fn])
    - mouseenter([[data],fn])
    - mouseleave([[data],fn])
    - mousemove([[data],fn])
    - mouseout([[data],fn])
    - mouseover([[data],fn])
    - mouseup([[data],fn])

- 键盘

    - keydown([[data],fn])
    - keypress([[data],fn])
    - keyup([[data],fn])

- 其他

    - error([[data],fn])
    - resize([[data],fn])
    - scroll([[data],fn])
    - select([[data],fn])
    - unload([[data],fn])

备注：参考 [Jquery API](http://tool.oschina.net/apidocs/apidoc?api=jquery) 来使用这些方法。

## 事件对象
TODO

## 事件处理
- 为匹配元素绑定特定事件
- 为匹配元素绑定多个事件
- 为匹配元素的特定子元素绑定特定事件或多个事件
- 为事件处理程序传递额外的数据
- 终止事件默认行为和事件冒泡

### 事件绑定

- `bind(type: string, callback: function)`：给每个匹配元素的特定事件或多个绑定事件处理函数（多个时间使用空格分开）；
- `bind(events: object)`：一个或多个事件类型的字符串和函数的数据映射来执行他们；
- `bind(type: string, data: object, callback: function`：参数 data 作为 event.data 属性值传递给事件对象的额外数据对象
- `bind(type: string, [data: object], false)`：使每个匹配元素的事件的默认行为失效

    `bind(type: string, [data: object], function(e) {e.preventDefault();})`

- `bind(type: string, [data: object], function() {return false;})`：使每个匹配元素的事件停止冒泡

    `bind(type: string, [data: object], function(e) {e.stopPropagation();})`

### 事件动态绑定
### 事件委派
### 一次性事件
jQuery one 方法指定一次性的回调函数，即这个函数只能运行一次，这对提交表单很有用。

用法：`one(type,[data],fn)`

### 统一事件绑定

- `on(eve,[sel],[data],fn)`

    - `$('li').on('click', function (e) {})`
    - `$('li').on('mouseenter mouseout', function (e) {})`
    - `$('ul').on('click', 'li', function (e) {})`：为 ul 的子元素 li 绑定 click 事件的回调函数
    - `$('li').on('click', { id: 1 }, function (e) {})`


- `off(eve,[sel],[fn])`

备注：jQuery 1.7+

### 事件切换
- `hover([over,]out)`
- `toggle(fn, fn2, [fn3, fn4, ...])`

### 事件触发
- `trigger(type,[data])`
- `triggerHandler(type, [data])`

## 命名空间
同一个事件有时绑定了多个回调函数，这时如果想移除其中的一个回调函数，可以采用“名称空间”的方式，即为每一个回调函数指定一个二级事件名，然后再用 off 方法移除这个二级事件的回调函数。

```javascript
// 可以将 click.logging 当做点击事件类型 click 的子类型
$('li').on('click.logging', function () {
  console.log('click.logging callback removed');
});
$('li').off('click.logging');
```

参考文献

- [event.namespace](https://api.jquery.com/event.namespace/)
- [Namespaced Events in jQuery](https://css-tricks.com/namespaced-events-jquery/)
- [jQuery 事件的命名空间](https://segmentfault.com/a/1190000000339421)
- [jquery的事件命名空间详解](http://www.cnblogs.com/lyzg/p/5347857.html)
- [jQuery的事件绑定命名空间](http://mao.li/javascript/jquery-namespaced-events/)

# 常见问题
- jQuery 脚本触发事件不会引发浏览器对该事件的默认行为
- bind VS live VS delegate VS on

    - `bind(type,[data],fn)`：为每个匹配元素的特定事件绑定事件处理函数

        **直接绑定在元素上**

    - `live(type,[data],fn)`：给所有匹配的元素附加一个事件处理函数，即使这个元素是以后再添加进来的

        **通过冒泡的方式来绑定到元素上的。更适合列表类型的，绑定到 document DOM 节点上。和 `.bind()` 的优势是支持动态数据。**

    - `delegate(selector,[type],[data],fn)`：指定的元素（属于被选元素的子元素）添加一个或多个事件处理程序，并规定当这些事件发生时运行的函数

        **更精确的小范围使用事件代理，性能优于 `.live()`**

    - `on(events,[selector],[data],fn)`：在选择元素上绑定一个或多个事件的事件处理函数

        **最新的 1.9 版本整合了之前的三种方式的新事件绑定机制**

    备注：[.delegate() vs .on()](http://stackoverflow.com/questions/8359085/delegate-vs-on)

