# Layout

- frame
- auto layout

    - NSLayoutConstraint（iOS 6+）
    - NSLayoutAnchor（iOS 9+）
    - UIStackView（iOS 9+）
    - [VFL](https://www.kodeco.com/277-auto-layout-visual-format-language-tutorial)
    - sizeClass

- 第三方库

    - [YogaKit](https://github.com/facebook/yoga)
    - [Masonry](https://github.com/SnapKit/Masonry)
    - [SnapKit](https://github.com/SnapKit/SnapKit)
    - [ComponentKit](https://github.com/facebook/componentkit)
    - [LayoutKit](https://github.com/linkedin/LayoutKit)
    - [MyLinearLayout](https://github.com/youngsoft/MyLinearLayout)
    - [Texture](hhttps://github.com/TextureGroup/Texture)
    - [LayoutBox](https://github.com/layoutBox)

## 教程


- frame.origin.x/y 视图左上角在父视图中的位置 
- frame.size.width/height 视图在父视图中的大小

修改 UIView 的 transform，bounds、anchorPoint、position 都会影响 frame 的位置和大小。

- bounds.orgin.x/y 子视图的坐标原点偏移量（有点像滚动容器的偏移量），默认 x:0,y:0，即原点是视图左上角，如果设置 x:100,y:100，那么子视图的的坐标原点是相对左上角的 x:-100,y:-100 位置
- bounds.size.width/height 会影响视图在父视图中的位置和大小，修改 bounds 大小后 frame 的计算公式是 

  - frame.origin.x = position.x - anchorPoint.x * bounds.width  —— 默认 anchorPoint.x 为 0.5，在没修改 bounds 大小的情况下，position.x 相当于矩形中心点的坐标
  - frame.origin.y = position.y - anchorPoint.y * bounds.height
  - frame.size.width = bounds.size.width
  - frame.size.height = bounds.size.height

## UIStackView

- [UIStackView 入坑指南](https://juejin.cn/post/6844903752227373064)

## 参考文献

- [iOS 布局总结](https://tbfungeek.github.io/2019/08/06/iOS-%E5%86%85%E7%BD%AE%E5%B8%83%E5%B1%80%E6%96%B9%E5%BC%8F%E5%AF%B9%E6%AF%94-%E5%B8%83%E5%B1%80%E7%9B%B8%E5%85%B3%E5%87%BD%E6%95%B0%E4%BB%8B%E7%BB%8D-%E5%B8%83%E5%B1%80%E7%9B%B8%E5%85%B3%E4%B8%89%E6%96%B9%E5%BC%80%E6%BA%90%E9%A1%B9%E7%9B%AE%E5%AF%B9%E6%AF%94/#)
- [iOS UI布局简史](https://juejin.cn/post/6844903925028536333#heading-6)
- [iOS Auto Layout学习笔记](https://juejin.cn/post/6844903925028536333#heading-6)
- [iOS中NSLayoutConstraint使用](https://www.jianshu.com/p/fe6d3d2b4f2a)
