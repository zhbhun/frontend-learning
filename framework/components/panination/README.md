# Bootstrap
HTML

```html
<nav>
  <ul class="pagination">
    <li class="disabled"><a href="#">&laquo;</a></li>
    <li class="active"><a href="#">1</a></li>
    <li><a href="#">2</a></li>
    <li><a href="#">3</a></li>
    <li><a href="#">4</a></li>
    <li><a href="#">5</a></li>
    <li><a href="#">&raquo;</a></li>
  </ul>
</nav>
```

CSS

- ul.pagination

    - `display: inline-block` 用于新建 BFC，使得 ul.pagination 的浮动子节点撑起容器
    - `padding-left: 0` 用于消除默认的左边距样式

- ul.pagination > li

    - `display: inline` 用于去除默认的列表样式（块级别，垂直排列）实现水平排列
    - 存在四中状态：正常，活动，禁用，悬浮

- ul.pagination > li > a

    - `float: left` 消除左右空白
    - padding 和 line-height 控制分页组件的大小
    - `margin-left: -1px` 消除左侧边框，解决相邻边框叠加，看起来更粗的问题

- ...
