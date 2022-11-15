# mask-image

CSS 遮罩使您可以选择使用图像作为遮罩层，完全透明的区域将导致该区域下方的图像部分不可见，但是，使用半透明的区域将允许一些原始图像显示出来。

## 教程

### 支持的图像格式

- 图片
- SVG：两种使用方式

    1. 在 SVG 中包含一个 `<mask>` 属性，并在 mask-image 属性中引用该元素的 ID。

        ps：对比方法 2，这种方法的优点是可以对任何 HTML 元素应用遮罩，而不仅限于图像。但是，Firefox 是唯一支持这种方法的浏览器。

    2. 对于最常见的遮罩图像场景，我们可以将图像包含在 SVG 中。

        只支持图片。

- 渐变色

### 遮罩位置

- [mask-origin](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-origin)
- [mask-position](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-position)

### 遮罩大小

- [mask-size](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-size)

### 折叠重复

- [mask-repeat](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-repeat)

### 遮罩裁剪

- [mask-clip](https://developer.mozilla.org/en-US/docs/Web/CSS/mask-clip)

### 多重遮罩

与背景图像一样，您可以指定多个遮罩来源

### 缩写方式

- [mask](https://developer.mozilla.org/en-US/docs/Web/CSS/mask)

## 进阶

### 兼容性

- 使用浏览器前缀 `-webkit-`
- 使用 @supports 检测

    ```css
    @supports(-webkit-mask-image: url(#mask)) or (mask-image: url(#mask)) {
      /* code that requires mask-image here. */
    }
    ```

参考文献

- [CSS Masks - caniuse](https://caniuse.com/css-masks)

## 参考文献

- [使用 CSS 的 mask-image 属性对图像应用不同的效果](https://web.dev/i18n/zh/css-masking/)
- [客栈说书：CSS遮罩CSS3 mask/masks详细介绍](https://www.zhangxinxu.com/wordpress/2017/11/css-css3-mask-masks/)
- [使用 mask-image 属性在 CSS 中屏蔽图像](https://www.gingerdoc.com/tutorials/css-masking-with-mask-image)
