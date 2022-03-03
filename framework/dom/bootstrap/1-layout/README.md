Bootstrap 提供了一套响应式、移动设备优先的流式栅格系统，随着屏幕或视口尺寸的增加，系统会自动分为最多 12 列。

# 用法示例
- 基本用法

    - 说明：栅格系统用于通过一系列的行与列的组合来创建页面布局，你的内容就可以放入这些创建好的布局中。

        ```html
        <div class="container">
          <div class="row">
            <div class="col-xs-12">...</div>
          </div>
        </div>
        ```

    - 要点：
    
        - 行（`div.row`）必须放在容器（`div.container`）内；
        - 列（`div.col`）必须放在行（`div.row`）内；
        - 内容必须放在列内

    - 示例：`./examples/basic-usage.html`

- 响应式容器大小

    - 说明：随着浏览器窗口的大小变化，栅格容器的宽度也响应式地变化
    - 示例：`./examples/container-size.html`

- 响应式列大小

    - 说明：容器宽度随着浏览器窗口响应式变化，容器内的列宽度也可以根据屏幕宽度来响应式设置
    - 要点：明记每个响应式断点宽度和容器宽度，对应宽度设置列大小
    - 示例：`./examples/responsive-column.html`

- 响应式列嵌套
- 响应式列偏移
- 响应式列排序
- 响应式列溢出

    如果一“行（row）”中包含了的“列（column）”大于 12，多余的“列（column）”所在的元素将被作为一个整体另起一行排列。

    测试示例：`./examples/responsive-column-resets.html`

- 利用媒体查询

    ```less
    // 通过不同宽度的媒体查询的先后顺序来层叠样式
    // 超小屏幕：没有任何媒体查询相关的代码，因为这在 Bootstrap 中是默认的（移动设备优先）
    @media (min-width: @screen-sm-min) { /* ... */ } // 小屏
    @media (min-width: @screen-md-min) { /* ... */ } // 中屏
    @media (min-width: @screen-lg-min) { /* ... */ } // 大屏

    // 将 CSS 的影响限制在更小范围的屏幕大小之内
    @media (max-width: @screen-xs-max) { /* ... */ } // 极小屏
    @media (min-width: @screen-sm-min) and (max-width: @screen-sm-max) { /* ... */ } // 小屏
    @media (min-width: @screen-md-min) and (max-width: @screen-md-max) { /* ... */ } // 中屏
    @media (min-width: @screen-lg-min) { /* ... */ } // 大屏
    ```

# 实现原理
栅格系统的实现原理非常简单，仅仅是通过**定义容器大小，平分 12 份，再调整内外边距，最后再结合媒体查询**，就制作出了强大的响应式的栅格系统。 Bootstrap默认的栅格系统平分为12份。

- 媒体查询断点

    - 大屏断点：大于等于 1200px，使用大屏容器
    - 中屏断点：大于等于 992px，小于 1200px，使用中屏容器
    - 小屏断点：大于等于 768px，小于 992px，使用小屏容器
    - 极小屏断点：小于 768px，使用极小屏容器

- 五中容器大小

    - 大屏容器：1170px
    - 中屏容器：970px
    - 小屏容器：750px
    - 极小屏容器：100%
    - 流式布局：100%

- 12 等分

    - `.col-lg-{1-12}`：大屏列大小
    - `.col-md-{1-12}`：中屏列大小
    - `.col-sm-{1-12}`：小屏列大小
    - `.col-xs-{1-12}`：极小屏列大小

    疑问：这里的屏幕大小指的是设备的屏幕宽度还是父元素宽度？

    响应式 12 等分查询的宽度是屏幕宽度。

- 内外边距

    - 容器：左右内边距 15px
    - 行：左右外边距 -15px
    - 列：左右内边距 15px

    疑问：为什么容器和行需要定义互相抵消的内外边距？

    假如行没有负的外边距，在实现栅格嵌套的时候，行嵌在列里无法利用内边距，嵌套行内部的列又有内边距，这会与外边的列内边距叠加。

源代码

- `bootstrap/less/variables.less`
- `bootstrap/less/grid.less`


