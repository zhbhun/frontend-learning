# 页面可视化搭建

## 功能结构

### 排版布局

| 方式/竞品 | plasmic | webflow | 稿定 |
| --------- | ------- | ------- | ---- |
| 自由布局  | ✓       | ✗       | ✗    |
| 流式布局  | ✗       | ✓       | ✗    |
| 弹性布局  | ✓       | ✓       | ✗    |
| 网格布局  | ✓       | ✓       | ✗    |

细节问题

- 布局切换：关注切换后的子组件位置和大小
  - plasmic：
    - 自由布局 =》非自由布局：重置子组件的位置样式
    - 非自由布局 =》自由布局：保留非自由布局的坐标位置
  - webflow：不支持自由布局，所以没有该问题
  - 稿定：不支持
- 子组件拖拽容易误拖拽到别的容器里
  市面上的编辑器暂时没有看到比较好的解决方案，是否可以考虑配合快捷键来实现，比如按住 shift 键表示拖拽组件始终在目标容器里，或者反转下：默认是在同级变动，需要按住 shift 或 command 键盘，才能脱出容器。
- ...

### 组件定位

| 定位/竞品 | plasmic | webflow | 稿定 |
| --------- | ------- | ------- | ---- |
| 默认定位  | ✓       | ✓       | ✗    |
| 相对定位  | ✗       | ✓       |      |
| 自由定位  | ✓       | ✓       | ✓    |
| 粘性定位  | ✓       | ✓       | ✗    |
| 固定定位  | ✓       | ✓       | ✗    |

细节问题

- 非自由布局容器 + 非默认定位子组件：子组件是否可以拖拽

  | 定位/竞品 | plasmic                          | webflow                          | 稿定   |
  | --------- | -------------------------------- | -------------------------------- | ------ |
  | 相对定位  | 不支持                           | 不可以拖拽，需要手动调整位置属性 | 不支持 |
  | 自由定位  | 支持拖拽                         | 同上                             | 不支持 |
  | 粘性定位  | 不支持拖拽，需要手动调整位置属性 | 同上                             | 不支持 |
  | 固定定位  | 不支持拖拽，需要手动调整位置属性 | 同上                             | 不支持 |
  
- 

### 组件状态

| 特性/竞品 | plasmic | webflow | 稿定 |
| --------- | ------- | ------- | ---- |
| 悬浮状态  | ✓       | ✓       | ✗    |
| 聚焦状态  | ✓       | ✓       | ✗    |
| 按压状态  | ✓       | ✓       | ✗    |

### 定制组件

- plasmic：可以
- webflow：可以
- 稿定“：不支持

### 图片管理

| 特性/竞品 | plasmic | webflow | 稿定 |
| --------- | ------- | ------- | ---- |
| 图片管理  | ✓       | ✓       | ✓    |
| 批量上传  | ✗       | ✓       | ✓    |
| 后台上传  | ✗       | ✓       | ✓    |
| 图片分组  | ✗       | ✓       | ✓    |
| 链接图片  | ✓       | ✗       | ✗    |
| 依赖分析  | ✓       | ✗       | ✗    |

## 远程组件加载

- [低代码平台远程组件加载的多种方案](https://mp.weixin.qq.com/s?__biz=MzI2MjcxNTQ0Nw==&mid=2247500403&idx=1&sn=3470062142a9ad0ddbece75e915a1a5e&chksm=ea44632bdd33ea3d82074a59cfb0388e45e02cda07719672e4db40fd6d31a235b3e294732d78&mpshare=1&scene=1&srcid=0803kipweJuMt6e0ytTBVegH&sharer_sharetime=1659502754360&sharer_shareid=23bfc8f6684b676886641da1cfece5af&version=4.0.2.90474&platform=mac#rd)

## 参考文献

- [浅谈搭建平台 - 画布篇](https://mp.weixin.qq.com/s/pfWplWHajZDcsOH_m3rUMw)
- [页面可视化搭建工具技术要点](https://github.com/CntChen/cntchen.github.io/issues/17)
- [页面可视化搭建工具前生今世](https://github.com/CntChen/cntchen.github.io/issues/15)
- [云凤蝶可视化搭建的推导与实现](https://zhuanlan.zhihu.com/p/90746742)
- [前端可视化搭建二三事](https://github.com/SunXinFei/sunxinfei.github.io/issues/26)
- [「可视化搭建系统」——从设计到架构，探索前端的领域和意义](https://juejin.im/post/5f1e98c05188252e5522dc0c)
- [从零开发一款图片编辑器Mitu-Dooring](https://mp.weixin.qq.com/s/SEIgiDJZOCX11JqxFdiKUw)
- [这可能是目前最好用的开源可视化拖拽框架](https://juejin.cn/post/6990000320822657031)
- [基于自然流布局的H5编辑器brick design 项目篇](https://juejin.cn/post/6883099504480878600)
- [我也做了一个可视化H5编辑器](https://juejin.cn/post/6919347925860499463)
- [我用 Vue +Fabric.js写了个简易的H5可视化图片编辑器](https://juejin.cn/post/6994365575027752967)
- [从零设计可视化大屏搭建引擎](https://juejin.cn/post/6981257575425654792)
- [Vue + Egg 实现一个 H5页面可视化编辑器 / 可视化配置平台](https://juejin.cn/post/7001077797808504839)
- [设计系统的未来](https://www.bilibili.com/video/BV1KG4y1x75q/?spm_id_from=333.337.search-card.all.click&vd_source=2e69ba889e556e858093542d78fc08c0) / [Subcomponents](https://medium.com/eightshapes-llc/subcomponents-753ce9f6600a)
