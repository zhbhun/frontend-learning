# 常见问题
1. 介绍一下标准的 CSS 的盒子模型？低版本 IE 的盒子模型有什么不同的？

    有 IE 盒子模型和 W3C 盒子模型，区别是 IE 的 content 部分把 border 和 padding 计算了进去。

2. 为什么 bootstrap 采用 IE 盒子模型？

    - 布局计算元素尺寸时需要预留 padding 和 border
    - border 和 padding 的调整会破坏布局
    - 采用响应式布局时，不好预留 padding 和 border
    - 参考 [为什么bootstrap采用border-box盒模型](http://staynoob.cn/post/css/%E4%B8%BA%E4%BB%80%E4%B9%88bootstrap%E9%87%87%E7%94%A8border-box%E7%9B%92%E6%A8%A1%E5%9E%8B/)

3. W3C 盒子模型 VS IE 盒子模型？

    TODO
