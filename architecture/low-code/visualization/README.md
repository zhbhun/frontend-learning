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

## 技术要点

### 远程组件加载

- [低代码平台远程组件加载的多种方案](https://mp.weixin.qq.com/s?__biz=MzI2MjcxNTQ0Nw==&mid=2247500403&idx=1&sn=3470062142a9ad0ddbece75e915a1a5e&chksm=ea44632bdd33ea3d82074a59cfb0388e45e02cda07719672e4db40fd6d31a235b3e294732d78&mpshare=1&scene=1&srcid=0803kipweJuMt6e0ytTBVegH&sharer_sharetime=1659502754360&sharer_shareid=23bfc8f6684b676886641da1cfece5af&version=4.0.2.90474&platform=mac#rd)

### 字体加载机制

- 提取法：组件的字体样式提供所有可用的字体，运行的时候收集所有实际使用到的字体，然后插入对应的字体样式

  - 优点：操作简单，用户可以直接使用大部分字体
  - 缺点：收集逻辑较为复杂，如果遇到动态样式时难以实现

- 预设法：全局统一添加可用的字体，组件的字体样式只显示已经添加的字体，运行的时候加载预设字体节课。

  - 优点：实现简单，运行时只有加载全局配置的字体即可
  - 缺点：操作没那么快捷，用户需要预设好字体

## 参考文献

- [页面可视化搭建工具前生今世](https://github.com/CntChen/cntchen.github.io/issues/15)
- [云凤蝶可视化搭建的推导与实现](https://zhuanlan.zhihu.com/p/90746742)
- [前端可视化搭建二三事](https://github.com/SunXinFei/sunxinfei.github.io/issues/26)
- [「可视化搭建系统」——从设计到架构，探索前端的领域和意义](https://juejin.im/post/5f1e98c05188252e5522dc0c)
- [这可能是目前最好用的开源可视化拖拽框架](https://juejin.cn/post/6990000320822657031)
- [基于自然流布局的H5编辑器brick design 项目篇](https://juejin.cn/post/6883099504480878600)
- [我用 Vue +Fabric.js写了个简易的H5可视化图片编辑器](https://juejin.cn/post/6994365575027752967)
- [从零设计可视化大屏搭建引擎](https://juejin.cn/post/6981257575425654792)
- [Vue + Egg 实现一个 H5页面可视化编辑器 / 可视化配置平台](https://juejin.cn/post/7001077797808504839)
- [设计系统的未来](https://www.bilibili.com/video/BV1KG4y1x75q/?spm_id_from=333.337.search-card.all.click&vd_source=2e69ba889e556e858093542d78fc08c0) / [Subcomponents](https://medium.com/eightshapes-llc/subcomponents-753ce9f6600a)

综合

- [前端页面可视化搭建工具业界的轮子](https://juejin.cn/post/6858881797490098190) / [20+个前端可视化搭建工具，一次玩个够](https://jishuin.proginn.com/p/763bfbd52af4)
- [「可视化搭建系统」——从设计到架构，探索前端领域技术和业务价值](https://zhuanlan.zhihu.com/p/164558106)
- [页面可视化搭建工具技术要点](https://github.com/CntChen/cntchen.github.io/issues/17)
- [可视化搭建的一些思考和实践](https://mp.weixin.qq.com/s?__biz=MzU2Mzk1NzkwOA%3D%3D&chksm=fc530835cb2481233acc7ac2c856b30c7698dd9d2aec1514b5c2fa4165bc2728f7b261c4938f&idx=1&mid=2247487950&scene=21&sn=e674a2f9379b9c9b8a149498a50c17f8&utm_source=pocket_reader)
- [Spotify 如何可视化系统架构图](https://www.infoq.cn/article/s5UwbP01ga8akJIFgtZV?utm_source=pocket_saves)
- [基于 React 的可视化编辑平台实践](https://zhuanlan.zhihu.com/p/94016600?utm_oi=35897751896064&utm_source=pocket_reader)
- [技术周报· 基于设计稿识别的可视化低代码系统实践](https://mp.weixin.qq.com/s/JUXz9TOKbkO1oAzHjVfwnQ)
- [可视化拖拽组件库一些技术要点原理分析](https://github.com/woai3c/Front-end-articles/issues/19)

  - [可视化拖拽组件库一些技术要点原理分析（二）](https://github.com/woai3c/Front-end-articles/issues/20)
  - [可视化拖拽组件库一些技术要点原理分析（三）](https://github.com/woai3c/Front-end-articles/issues/21)
  - [可视化拖拽组件库一些技术要点原理分析（四）](https://segmentfault.com/a/1190000042282658)

画布

- [浅谈搭建平台 - 画布篇](https://mp.weixin.qq.com/s/pfWplWHajZDcsOH_m3rUMw)
- [可视化搭建平台之跨iframe拖拽](https://zhuanlan.zhihu.com/p/353043053?utm_oi=35897751896064&utm_source=pocket_reader)

数据

- [如何设计实现 h5 页面搭建-数据模型](https://mp.weixin.qq.com/s/Fyl3SMHjv3ROw9QUBdwutA?utm_source=pocket_reader)

案例

- [美团外卖前端可视化界面组装平台 —— 乐高](https://zhuanlan.zhihu.com/p/27288444?utm_source=pocket_reader)
- [我在闲鱼做搭建——魔鱼搭投编辑器介绍](https://zhuanlan.zhihu.com/p/538265765?utm_oi=35897751896064&utm_source=pocket_reader)
- [从零开发一款图片编辑器Mitu-Dooring](https://mp.weixin.qq.com/s/SEIgiDJZOCX11JqxFdiKUw)
- [我也做了一个可视化H5编辑器](https://juejin.cn/post/6919347925860499463)
- [可视化搭建移动端店铺解决方案](https://mp.weixin.qq.com/s?__biz=MzU2Mzk1NzkwOA%3D%3D&chksm=fc530e9acb24878c90ce680610dd0a339dccdf2e04aea0ef815b71178c137032c3f8afbfa02a&cur_album_id=1885104505269108738&idx=1&mid=2247489377&scene=189&sn=2f205a9519c8f0e391f1e7473851153d&utm_source=pocket_saves)
- [凹凸技术揭秘·羚珑页面可视化·成长蜕变之路](https://segmentfault.com/a/1190000038792146)
- [从零开发一款图片编辑器Mitu-Dooring](https://mp.weixin.qq.com/s/SEIgiDJZOCX11JqxFdiKUw)

开源

- [rxeditor](https://github.com/rxdrag/rxeditor)

讨论

- [我做了一个 HTML 可视化编辑工具，有前途吗？](https://www.zhihu.com/question/390956688/answer/1184696066?utm_oi=35897751896064&utm_source=pocket_reader)
