# 常见问题
1. 行内元素有哪些？块级元素有哪些？ 空(void)元素有那些？

    > 块级元素：div ul ol li dl dt dd h1 h2 h3 h4…p
    >
    > 行内元素：a b span img input select strong（强调的语气）
    >
    > 空元素：br hr img input link meta area base col command embed keygen param source track wbr

2. display有哪些值？说明他们的作用

    - block：块类型。默认宽度为父元素宽度，可设置宽高，换行显示。
    - none：缺省值。象行内元素类型一样显示。
    - inline：行内元素类型。默认宽度为内容宽度，不可设置宽高，同行显示。
    - inline-block：默认宽度为内容宽度，可以设置宽高，同行显示。
    - list-item：象块类型元素一样显示，并添加样式列表标记。
    - table：此元素会作为块级表格来显示。
    - inherit：规定应该从父元素继承 display 属性的值。
