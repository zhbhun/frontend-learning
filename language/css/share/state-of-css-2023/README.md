# State of CSS 2023

## 类型安全的 CSS 变量

- [The @property Rule](https://www.w3.org/TR/css-properties-values-api-1/#at-property-rule)
- [@property on MDN](https://developer.mozilla.org/zh-CN/docs/Web/CSS/@property)
- [@property on web.dev](https://web.dev/at-property/)
- [Zoom focus demo](https://codepen.io/argyleink/pen/rNwWwor)
- [CSS Tricks: Exploring @property and its animating powers](https://css-tricks.com/exploring-property-and-its-animating-powers/)

### 是什么

CSS 变量非常的灵活，允许将各种东西存储在一个命名的变量中，然后可以进行扩展、计算、共享等等。但是，太过灵活，也会存在一些问题。

下面是一个阴影样式使用自定义变量的场景，只有对应的变量值是有效的才能正常运行。例如 设置 `--x: red`，整个阴影就会中断。

```css
box-shadow: var(--x) var(--y) var(--blur) var(--spread) var(--color);
```

这就是 @property 的作用，它可以定义类型化的 CSS 变量，设置允许接收的值类型、初始值和是否继承。

### 怎么用

要使用 @property，需要在 CSS 样式表中定义自定义属性。例如，下面的代码定义了一个名为“--my-color”的属性：

```css
@property --my-color {
  syntax: '<color>';
  initial-value: red;
  inherits: false;
}
```

其中，syntax 表示属性的语法，initial-value 表示属性的初始值，inherits 表示属性是否可以继承。

在样式规则中，可以使用自定义属性来控制样式。例如，下面的代码使用了名为“--my-color”的自定义属性来控制颜色：

```css
.my-class {
  color: var(--my-color);
}
```

在 HTML 中，可以为需要应用样式的元素添加自定义属性的值。例如，下面的代码为一个 div 元素设置了自定义属性的值：

```html
<div class="my-class" style="--my-color: blue;">Hello World!</div>
```

- [`<syntax>`](https://www.w3.org/TR/css-properties-values-api-1/#supported-names)
- [演示示例](./property/property.html)

#### 动画样式属性

除了类型安全之外，@property 让 CSS 变量支持动画。因为类型化的 CSS 属性可以让浏览器了解开发者在其他过于复杂的插值中的意图。它从本质上限制了可能性的范围，使浏览器可以对一个样式的某些方面进行动画处理，而以前是不可能的。

示例：

- [animation-variable.html](./property/animation-variable.html)
- [animation-property.html](./property/animation-property.html)

### 兼容性

![](./property/caniuse.png)

## Media Queries: Range Syntax

“Media Queries Range Syntax” 是对媒体查询语法的改进，可以和普通数学比较运算符一起使用： >, <, >=, 或 <=。

```css
/* 这两行的效果是等价的 */
@media (100px <= width <= 1900px) {}
@media (min-width: 100px) and (max-width: 1900px) {}
```

兼容性：可以使用 PostCSS 来提前使用该语法

![](./media-query-range-syntax/caniuse.png)

参考文献

- [Media query range syntax specification](https://www.w3.org/TR/mediaqueries-5/#mq-range-context)
- [Media query range syntax on MDN](https://developer.mozilla.org/docs/Web/CSS/Media_Queries/Using_media_queries#syntax_improvements_in_level_4)
- [Media query range syntax PostCSS plugin](https://github.com/postcss/postcss-media-minmax)

## Custom Media

- [Custom media queries specification](https://www.w3.org/TR/mediaqueries-5/#custom-mq)
- [Custom media queries PostCSS plugin](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-custom-media)

### 是什么

CSS @custom-media 规则定义了自定义媒体查询，可以在 CSS 中重复使用，类似于自定义变量。

如下所示，假设很多模块都要设置大于等于 768px 的屏幕样式，那么每个地方都要重复的写 `@media (min-width: 768px)`，如果后期要做调整的话，需要遍历所有代码进行修改。

```css
/* page1 */
@media (min-width: 768px) {
}
/* page2 */
@media (min-width: 768px) {
}
```

### 怎么用

@custom-media 规则需要定义一个名称和一个表示式。名称必须以 `--` 开头，表示式则必须是有效的媒体查询，例如 `screen and (min-width: 768px)`。

```css
@custom-media --portrait      (orientation: portrait);
@custom-media --landscape     (orientation: landscape);

@custom-media --md-only       (480px <= width <= 768px);
@custom-media --md-n-above    (width >= 768px);
@custom-media --md-n-below    (width < 768px);
@custom-media --md-phone      (--md-only) and (--portrait);

@media (--md-n-above) {
  :root {
    …
  }
}
```

### 兼容性

虽然目前大部分浏览器都还不支持该功能，但我们可以使用 postcss 的插件 [postcss-custom-media](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-custom-media) 来提前使用该语法。


## 嵌套选择器

- [@nest specification](https://www.w3.org/TR/css-nesting-1/)
- [@nest PostCSS plugin](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting)
- [Bramus: The future of CSS: Nesting Selectors](https://www.bram.us/2019/03/17/the-future-of-css-nesting-selectors/)

### 是什么

嵌套选择是 CSS 中的一种规则，它允许你将样式规则嵌套在另一个选择器内部。通过使用嵌套选择器，你可以将样式规则分组在一起，从而使样式更加简洁、易于阅读。

### 怎么用

使用方式基本和现有的 CSS 预处理器一致。例如，下面的代码将样式规则嵌套在名为“my-class”的选择器内部：

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      .my-class {
        & .my-nested-class {
          color: red;

          &:hover {
            color: blue;
          }
        }
      }
    </style>
  </head>
  <body>
    <div class="my-class">
      <div class="my-nested-class">Hello World!</div>
    </div>
  </body>
</html>
```

### 兼容性

目前只有 Chrome 原生支持嵌套选择器，如果没有使用 CSS 预处理器的话，可以使用 PostCSS 的插件 [PostCSS Nesting](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-nesting) 来提前使用该语法。

![](./nest/caniuse.jpeg)

ps：CSS 规范里曾经使用了语法 `@nest` 来实现嵌套选择器，现在已经废弃了，在最新的规范里 `@nest` 已经被 `&` 取代了，这和主流的 CSS 预处理器的语法一致。

## Scoping styles

CSS @scope 允许将一组样式规则限定在一个指定的选择器范围内。通过这种方式，可以限制样式规则的作用范围，避免样式污染和选择器冲突的问题。

```css
.card__header {
  color: var(--text);
}

/* with @scope becomes */

@scope (.card) {
  header {
    color: var(--text);
  }
}
```

目前，@scope 规则还处于实验阶段，并未得到主流浏览器的支持（好像是因为实现后会影响渲染性能，所以没有实现），大家主要还是使用 Shadow DOM、BEM 规范、CSS Module 和 CSS In JS 等这些方案来实现作用域样式。

参考文献

- [@scope specification](https://www.w3.org/TR/css-scoping-1/)
- [@scope explainer](https://css.oddbird.net/scope/explainer/)
- [Remove `<style scoped>`](https://github.com/whatwg/html/issues/552)

## masonry layout(瀑布流布局)

- [Masonry layout specification](https://drafts.csswg.org/css-grid-3/#masonry-layout-algorithm)
- [Casonry-auto-flow on Can I Use](https://caniuse.com/mdn-css_properties_masonry-auto-flow)
- [Masonry layout on MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/masonry-auto-flow)
- [Smashing Magazine: Native CSS Masonry Layout with CSS Grid](https://www.smashingmagazine.com/native-css-masonry-layout-css-grid/)

### 是什么

CSS Masonry Layout 是一种布局方式，用于实现瀑布流式的布局效果。它可以让元素自适应容器宽度，自动换行并对齐。

ps：在此之前，一般使用 JavaScript 来实现瀑布流布局，参考[图片瀑布流，就是如此简单（so easy）](https://juejin.cn/post/6963071339108237319)。

### 怎么用

使用 CSS Masonry Layout 需要设置以下几个属性：

```css
.masonry {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: masonry;
}
```

![](./masonry-layout/screenshot.webp)

示例：[masonry-layout](./masonry-layout/index.html)

### 兼容性

目前只有 Firefox 版本的实现了该特性（需要开启实验性功能）。
