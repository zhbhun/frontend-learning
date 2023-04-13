- [table-layout](https://css-tricks.com/almanac/properties/t/table-layout/)
- [Fixed Table Layouts](https://css-tricks.com/fixing-tables-long-strings/)

## FAQ

### 富文本表格显示问题

存在问题：

1. 在富文本编辑器设置表格宽度后，实际渲染显示没有按照设定的宽度来限制显示，在小屏设备下超出屏幕显示了；

    通常是有包含较长的英文字符，默认没有自动断行，导致显示超出屏幕了。

2. 针对问题 1，在溢出的时候是否可以做内部横向滚动效果。

解决方案：

1. 给表格设置样式 `word-break: break-all; word-wrap: break-word;`，这样表格内的文本显示不会溢出表格的宽度限制；
2. 给表格设置样式 `display: block; overflow-x: auto; word-break: normal; word-wrap: normal;`，这样表格就会横向滚动显示。

    如果觉得文本换行效果不会可以额外设置 `white-space: nowrap;` 来实现。

参考示例：./examples/rich-text.html
