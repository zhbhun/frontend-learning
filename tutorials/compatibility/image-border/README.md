图片边框
========

## 问题

没有设置图片地址的 img 标签渲染时存在灰色边框

## 解决

给 img 标签设置一个空的 src 属性，或者通过选择器来隐藏

```css
img {
  display: none;
}


img[src] {
  display: block;
}
```

## 参考文献

- [How can I remove the border around an image without a source?](https://stackoverflow.com/questions/10441362/how-can-i-remove-the-border-around-an-image-without-a-source)
