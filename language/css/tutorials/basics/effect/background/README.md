背景
========

## 用法

```
background：[ <bg-layer>, ]* <final-bg-layer>
<bg-layer> = <bg-image> || <position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box>
<final-bg-layer> = <bg-image> || <position> [ / <bg-size> ]? || <repeat-style> || <attachment> || <box> || <box> || background-color
```

- 一个元素只能设置一种背景颜色；
- 一个元素可以设置多组背景图像；
- 如果设置的多组背景图之间存在着交集（即存在着重叠关系），前面的背景图会覆盖在后面的背景图之上；
- 在同一组背景定义中，如果背景颜色和背景图像都设置了，那么背景图像会覆盖在背景颜色之上。

### 背景内容

- [background-color](http://css.doyoe.com/properties/backgrounds/background-color.htm)
- [background-image](http://css.doyoe.com/properties/backgrounds/background-image.htm)

### 背景位置

- [background-origin](http://css.doyoe.com/properties/backgrounds/background-origin.htm)：背景图像计算位置时的参考原点
- [background-position](http://css.doyoe.com/properties/backgrounds/background-position.htm)
- [background-attachment](http://css.doyoe.com/properties/backgrounds/background-attachment.htm)

### 背景大小

- [background-size](http://css.doyoe.com/properties/backgrounds/background-size.htm)
- [background-repeat](http://css.doyoe.com/properties/backgrounds/background-repeat.htm)

    ps：注意混合使用 background-position 和 background-size 的情况，background-position 根据默认定位（左上角）实现重复显示后再根据新的位置来调整位置，background-size 控制每张图片

### 背景裁剪

- [background-clip](http://css.doyoe.com/properties/backgrounds/background-clip.htm)：背景图像向外裁剪的区域

## 应用

## 使用背景作为填充色之类的遮罩效果

- 原理：背景裁剪 + 透明文本色
- [示例](./examples/mask-text.html)

### 一个字符显示两个颜色

- 原理：线性渐变背景 + 背景裁剪 + 透明文本色
- [示例](./examples/one-char-in-two-color.html)
- 参考

    - [HalfStyle](https://github.com/arbelh/HalfStyle)
    - [Splitchar.js](https://github.com/razvanbalosin/Splitchar.js)
    - [Is it possible to apply CSS to half of a character?](https://stackoverflow.com/questions/23569441/is-it-possible-to-apply-css-to-half-of-a-character)
    - [CSS Display One Character in 2 Colors](https://stackoverflow.com/questions/22195606/css-display-one-character-in-2-colors)
