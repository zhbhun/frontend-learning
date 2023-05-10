- 新旧语法

    - webkit：`::-webkit-scrollbar`
    - 标准：`scrollbar-width` + `scrollbar-color`

        ps：只有 firefox 支持

- 系统样式

    - Mac：

        - 始终显示滚动条：占位

            - 滚动条轨道的左右两边都有边框，背景颜色为纯色
            - 滚动条拇指是圆形的，从左边和右边围绕它有空间    

        - 滚动式显示滚动条：不占位，滚动条拇指是圆角半透明黑色背景的长方形，

    - Window/Linux：占位

        - 滚动条上下（左右）两边有按钮
        - 滚动条轨道背景色为灰色
        - 滚动条拇指是深灰色背景的长方形

- 滚动条组成

    - `::webkit-scrollbar`：容器
    - `::-webkit-scrollbar-button`：左右（上下）点击按钮
    - `::-webkit-scrollbar-thumb`：滚动指示器
    - `::-webkit-scrollbar-track`：滚动轨道
    - `::-webkit-scrollbar-track-piece`：？
    - `::-webkit-scrollbar-corner`：水平和垂直滚动条交叉部分
    - `::-webkit-resizer`：调整大小部分

    ps：标准规范制定的样式没有那么多可控属性。

- 滚动条布局变化

    - 问题：滚动条会占用元素空间，在显示动态内容时，子元素的宽度会受滚动条显示的影响
    - 解决：
        
        - 使用 `scrollbar-gutter` 保持滚动条的占位
        - 使用 `overflow: overlay` 来组织股东条占位

- 作用范围

    - 全局

        ```css
        ::-webkit-scrollbar {}
        ```
    
    - 特定元素

        ```css
        .section::-webkit-scrollbar {}
        ```

- 滚动条样式

    - 轨道和拇指支持边框、渐变色和阴影
    - 悬浮效果：webkit 不支持，标准支持


## 示例

### Mac 样式的滚动条

```less
.scrollbar() {
  &::-webkit-scrollbar {
    background-color: #fff;
    width: 16px;
  }

  /* background of the scrollbar except button or resizer */
  &::-webkit-scrollbar-track {
    background-color: #fff;
  }

  /* scrollbar itself */
  &::-webkit-scrollbar-thumb {
    background-color: #babac0;
    border-radius: 16px;
    border: 4px solid #fff;
  }

  /* set button(top and bottom of the scrollbar) */
  &::-webkit-scrollbar-button {
    display: none;
  }
}

.scrollbar-hidden() {
  &::-webkit-scrollbar {
    display: none;
  }
}
```

## 参考文献

- [Custom Scrollbars In CSS](https://ishadeed.com/article/custom-scrollbars-css/)
- [scrollbar](https://css-tricks.com/almanac/properties/s/scrollbar/)
- [自定义滚动条(webkit系列)](http://www.cnblogs.com/rubylouvre/archive/2011/03/01/1968057.html)
- [CSS进阶篇--设置滚动条样式](https://segmentfault.com/a/1190000003708894)
- [Custom Scrollbars in WebKit](https://css-tricks.com/custom-scrollbars-in-webkit/)
- [CSS自定义滚动条样式](https://www.qianduan.net/css-custom-scroll-bar-style/)
- [CSS3自定义滚动条样式 -webkit-scrollbar](https://www.xuanfengge.com/css3-webkit-scrollbar.html)
