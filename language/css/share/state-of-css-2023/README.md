# State of CSS 2023

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

![](./nest/caniuse.jpeg)

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

兼容性：

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

## 兼容性

虽然目前大部分浏览器都还不支持该功能，但我们可以使用 postcss 的插件 [postcss-custom-media](https://github.com/csstools/postcss-plugins/tree/main/plugins/postcss-custom-media) 来提前使用该语法。

