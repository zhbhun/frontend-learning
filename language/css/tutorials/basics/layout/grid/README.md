# 网格布局

## 概念

- 容器和项目

    - 采用网格布局的区域，称为"容器"（container）
    - 容器内部采用网格定位的子元素，称为"项目"（item）。

- 行和列

    - 容器里面的水平区域称为"行"（row）
    - 垂直区域称为"列"（column）。

- 单元格：行和列的交叉区域，称为"单元格"（cell）。
- 网格线：划分网格的线，称为"网格线"（grid line）。水平网格线划分出行，垂直网格线划分出列。

## 用法

### 开启网格布局

- `display: grid` 指定一个块级容器采用网格布局；
- `display: inline-grid` 指定一个行内容器采用网格布局；

## 设置行列划分

- `grid-template-columns` 属性定义每一列的列宽
- `grid-template-rows` 属性定义每一行的行高。`

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

- fr 关键字

    ```less
    // 为了方便表示比例关系，网格布局提供了fr关键字（fraction 的缩写，意为"片段"）。
    .container {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
    ```

- minmax()

    minmax()函数产生一个长度范围，表示长度就在这个范围之中。它接受两个参数，分别为最小值和最大值。

- auto

    auto关键字表示由浏览器自己决定长度。

### 设置行列间距

- [CSS gap属性进化史](https://www.zhangxinxu.com/wordpress/2020/06/css-gap-history/)

### 设置对齐

- justify-items
- align-items
- place-items
- justify-content
- align-content
- place-content

## 参考文献

- [CSS Grid 网格布局教程](https://www.ruanyifeng.com/blog/2019/03/grid-layout-tutorial.html)
- [A guide to learning CSS](http://learncssgrid.com/)
- [Building Production-Ready CSS Grid Layouts Today](https://www.smashingmagazine.com/2017/06/building-production-ready-css-grid-layout)
