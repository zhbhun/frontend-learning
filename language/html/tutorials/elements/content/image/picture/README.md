# [picture](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/picture)

HTML `<picture> `元素通过包含零或多个 `<source>` 元素和一个 `<img>` 元素来为不同的显示/设备场景提供图像版本。浏览器会选择最匹配的子 `<source>` 元素，如果没有匹配的，就选择 `<img>` 元素的 src 属性中的 URL。然后，所选图像呈现在 `<img>` 元素占据的空间中。

## 用法

### 响应式图片格式

`<source>` 的 `type` 属性允许为元素的 srcset 属性指向的资源指定一个 MIME 类型。如果用户代理不支持指定的类型，那么这个 `<source>` 元素会被跳过。

参考测试示例 [type.html](./type.html)，关于图片的类型参考 [图像文件类型与格式指南](https://developer.mozilla.org/zh-CN/docs/Web/Media/Formats/Image_types)。

### 响应式图片文件或分辨率

`<source>` 的 `media` 属性允许你提供一个用于给用户代理作为选择 `<source>` 元素的依据的媒体条件 (media condition)（类似于媒体查询）。如果这个媒体条件匹配结果为 false，那么这个 `<source>` 元素会被跳过。

### 响应式图片像素密度

`srcset`

### 响应式显示大小

`sizes`

## 实践

### 不同屏幕显示一样大的图片

- 响应式图片格式
- 响应式图片像素密度

```html
<picture>
    <source srcset="foo-1x.webp, foo-1.5x.webp 1.5x, foo-2x.webp 2x" type="image/webp">
    <img srcset="foo-1x.jpeg, foo-1.5x.jpeg 1.5x, foo-2x.jpeg 2x" />
</picture>
```

### 不同屏幕显示不一样大的图片

- 响应式图片格式
- 响应式图片文件或分辨率
- 响应式图片像素密度
- 响应式图片大小

```html
<picture>
    <source
        srcset="bar@mobile_1x.webp, bar@mobile_1.5x.webp 1.5x, bar@mobile_2x.webp 2x"
        sizes="100vw"
        media="(max-width: 768px)"
        type="image/webp"
    >
    <source
        srcset="bar@mobile_1x.jpeg, bar@mobile_1.5x.jpeg 1.5x, bar@mobile_2x.jpeg 2x"
        sizes="100vw"
        media="(max-width: 768px)"
        type="image/jpeg"
    >
    <source
        srcset="bar@pad_1x.webp, bar@pad@1.5x.webp 1.5x, bar@pad@2x.webp 2x"
        sizes="33vw"
        media="(max-width: 1024px)"
        type="image/webp"
    >
    <source
        srcset="bar@pad_1x.jpeg, bar@pad_1.5x.jpeg 1.5x, bar@pad_2x.jpeg 2x"
        sizes="33vw"
        media="(max-width: 1024px)"
        type="image/jpeg"
    >
    <source
        srcset="bar@pc_1x.webp, bar@pc_1.5x.webp 1.5x, bar@pc_2x.webp 2x"
        sizes="254px"
        type="image/webp"
    >
    <img
        srcset="bar@pc_1x.jpeg, bar@pc_1.5x.jpeg 1.5x, bar@pc_2x.jpeg 2x"
        sizes="254px"
    />
</picture>
```

## FAQ

### 大小限制问题

picture 是 inline 元素无法设置宽高，img 元素在 picture 里正常显示，相当于在 img 外包裹了一个 span。一般来说，我们希望封装的组件只需要修改 picture 标签的样式就好了。

1. 设定 picture 为块或内联块样式，img 为块样式；
2. 限定宽高的情况，可以设置 img 的宽高为 100%；
3. 自动宽高的情况下，可以设置 img 的宽高为 auto；
4. 自动宽或高的情况喜爱，设置对应的 img 宽或高为 auto；

    如果设置宽高为 100% 的话，会导致部分浏览器占满外部容器。

## 参考文献

- [<picture>: The Picture element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture)
- [Source](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/source)
- [<img>: The Image Embed element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/img)
