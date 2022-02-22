- [实例精选](http://v3.bootcss.com/getting-started/#examples)

# 开始
- `./basic.html`
- `./starter-template.html`

# 导航条
- `./navbar.html`：包含导航条和一起附加内容的超级基础的模板；
- `./navbar-static-top.html`：包含一个静态导航条以及一些附加内容的超级基础的模板；
- `./navbar-fixed-top.html`

# 粘性页脚
- `./sticky-footer.html`
- `./sticky-footer-navbar.html`

# 非响应式布局
http://v3.bootcss.com/getting-started/#disable-responsive

Bootstrap 是一个移动先行的框架，默认情况下，针对不同的屏幕尺寸，会自动地调整页面，使其在不同尺寸的屏幕上都表现得很好。但是，如果不想使用这种特性，也可以禁用它。

1. 删除名称为 `viewpot` 的 `meta` 元素；
2. 响应式容器：为 `.container` 设置一个固定的宽度值，从而覆盖框架的默认 `width` 设置，例如 `width: 970px!important`；
3. 栅格系统：对于栅格布局，额外增加 `.col-xs-*` 样式，或替换 `.col-md-*` 和 `.col-lg-*` 样式；
4. 响应式导航：如果使用了导航条组件，还需要移除所有的折叠行为和展开行为；
5. 响应式表格：TODO
6. ...

备注：针对 IE8 仍然需要额外引入 Respond.js 文件（由于仍然利用了浏览器对媒体查询（media query）的支持，因此还需要做处理）。这样就禁用了 Bootstrap 对移动设备的响应式支持。

示例：`./non-responsive.html`
