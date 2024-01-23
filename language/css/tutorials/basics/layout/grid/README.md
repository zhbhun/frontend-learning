# 网格布局

## 概念

- 容器和项目

    - 采用网格布局的区域，称为"容器"（container）
    - 容器内部采用网格定位的子元素，称为"项目"（item）。

        ps：设为网格布局以后，容器子元素（项目）的 float、display: inline-block、display: table-cell、vertical-align 和 column-* 等设置都将失效。

- 行和列

    - 容器里面的水平区域称为"行"（row）
    - 垂直区域称为"列"（column）。

- 单元格：行和列的交叉区域，称为"单元格"（cell）。
- 网格线：划分网格的线，称为"网格线"（grid line）。水平网格线划分出行，垂直网格线划分出列。

## 用法

### 开启网格布局

- `display: grid` 指定一个块级容器采用网格布局；
- `display: inline-grid` 指定一个行内容器采用网格布局；

### 设置行列划分

- [`grid-template`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template)
- [`grid-template-columns`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template) 属性定义每一列的列宽
- [`grid-template-rows`](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-rows) 属性定义每一行的行高。`

用法

- 固定行和列

    ```less
    // 一个三行三列的网格，列宽和行高都是100px。
    .container {
      display: grid;
      grid-template-columns: 100px 100px 100px;
      grid-template-rows: 100px 100px 100px;
    }
    ```

- 百分比行和列

    ```less
    // 一个三行三列的网格，列宽和行高都是 1/3 大小。
    .container {
      display: grid;
      grid-template-columns: 33.33% 33.33% 33.33%;
      grid-template-rows: 33.33% 33.33% 33.33%;
    }
    ```

- 使用 repeat 简化配置

    ```less
    // repeat()接受两个参数，第一个参数是重复的次数（上例是3），第二个参数是所要重复的值。
    .container {
      display: grid;
      grid-template-columns: repeat(3, 33.33%);
      grid-template-rows: repeat(3, 33.33%);
    }
    ```

    ```less
    // 重复某种模式也是可以的，下面的代码定义了6列，第一列和第四列的宽度为100px，第二列和第五列为20px，第三列和第六列为80px。
    .container {
      display: grid;
      grid-template-columns: repeat(2, 100px 20px 80px);
      grid-template-rows: repeat(3, 33.33%);
    }
    ```

- 自动填充

    ```less
    // 表示每列宽度100px，然后自动填充，直到容器不能放置更多的列。
    .container {
      display: grid;
      grid-template-columns: repeat(auto-fill, 100px);
    }
    ```

    ps：如果有剩余的空间不显示

- fr 关键字

    ```less
    // 为了方便表示比例关系，网格布局提供了 fr 关键字（fraction 的缩写，意为"片段"，有点像 flex）。
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    ```

- minmax()

    minmax()函数产生一个长度范围，表示长度就在这个范围之中。它接受两个参数，分别为最小值和最大值。

- auto

    auto关键字表示由浏览器自己决定长度。

    ps：如果其他列式固定宽度，那么 auto 列会占用剩余空间，如果其他列存在 fr，那么实际内容宽度显示

### 设置行列间距

- 旧版

    - grid-gap
    - grid-column-gap
    - grid-row-gap

- 新版

    - gap
    - row-gap
    - column-gap

参考文献

- [CSS gap属性进化史](https://www.zhangxinxu.com/wordpress/2020/06/css-gap-history/)

### Auto Rows/Columns

有时候，一些项目的指定位置，在现有网格的外部。比如网格只有3列，但是某一个项目指定在第5行。这时，浏览器会自动生成多余的网格，以便放置项目。grid-auto-columns 属性和 grid-auto-rows 属性用来设置，浏览器自动创建的多余网格的列宽和行高。

- [grid-auto-rows](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-rows)
- [grid-auto-columns](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-auto-columns)

### grid-auto-flow

配置自动排列方式，默认先行后列。

- row
- column
- row dense
- column dense

### 区域配置

容器属性

- [grid-template-areas](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-areas)

---

项目属性

- [grid-area](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-area)
- [grid-column](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-column)
- [grid-column-end](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-column-end)
- [grid-column-start](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-column-start)
- [grid-row](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-row)
- [grid-row-end](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-row-end)
- [grid-row-start](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-row-start)

### 设置对齐

项目熟悉

- justify-items：设置单元格内容的水平位置（左中右）
- align-items：设置单元格内容的垂直位置（上中下）
- place-items：align-items属性和justify-items属性的合并简写形式
- justify-content：整个内容区域在容器里面的水平位置（左中右）
- align-content：align-content属性是整个内容区域的垂直位置（上中下）
- place-content

---

- justify-self
- align-self

## 参考文献

- [CSS Grid 网格布局教程](https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html)
- [A guide to learning CSS](http://learncssgrid.com/)
- [Building Production-Ready CSS Grid Layouts Today](https://www.smashingmagazine.com/2017/06/building-production-ready-css-grid-layout)
- [Grid Attack](https://codingfantasy.com/games/css-grid-attack)
- [Grid by Example](https://gridbyexample.com/examples/) - Everything you need to learn CSS Grid Layout
- [CSS Grid Layout Examples](https://webkit.org/demos/css-grid/)
- [An Interactive Guide to CSS Grid](https://www.joshwcomeau.com/css/interactive-guide-to-grid/)
