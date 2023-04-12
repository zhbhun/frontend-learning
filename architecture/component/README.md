# Web 组件

> 快速的完成一个特定的可以被抽象和复用并且可以扩展的功能模块，和使用什么框架无关。

- [web-design-in-4-minutes](https://github.com/jgthms/web-design-in-4-minutes)
- [web-design-standards](https://standards.usa.gov/)
- [Progressive Web App](https://developers.google.com/web/fundamentals/)
- [beautiful-web-type](http://hellohappy.org/beautiful-web-type/)

## 思考

> 分而治之是软件工程中的重要思想，是复杂系统开发和维护的基石，这点放在前端开发中同样适用。在解决了基本开发效率运行效率问题之后，前端团队开始思考维护效率，组件化是目前前端最流行的分治手段。

> 组件是模块化编程思想的体现，非常有利于代码的重用。标准格式的模块，可以跨平台、跨框架使用，构建、部署和与其他UI元素互动都有统一做法。

- [什么是组件化 模块化？](https://www.zhihu.com/question/20282684)
- [对组件化与模块化的思考与总结](http://tutuge.me/2016/03/29/modular-and-component-summary/)
- [组件化-前端编程的选择](http://www.primeton.com/read.php?id=2294&his=1)
- [2015前端组件化框架之路](https://github.com/xufei/blog/issues/19)
- [组件化——前端编程的选择](http://geek.csdn.net/news/detail/129016)

## 设计

原则

- 易用性

    - 合理拆解组件：不能将整个页面杂糅为一个组件，也不能将每一小块UI都封装为组件，组件开发者需要根据组件功能和目标来确定组件封装粒度。

        - 当该组件需要承载具体的额外功能时，相较于新增 API ，封装成独立的组件是更好的选择。

            例如：InputTag组件 在 Input、Tag 的基础上，增加了部分交互功能，API整合了两个组件的属性，作为一个全新的组件提供给开发者使用。相似的，InputNumber、AutoComplete、Mentions等组件也是基于单一职责原则封装的特定功能组件。
        
        - 当组件中存在可能被单独使用、可以承载独立功能的子组件时，可以将其以内部组件的形式提供。

            例如：图片预览功能通常依托着图片组件使用，在实际系统中，唤起图片预览的触发器不一定是图片，可能是按钮或其他触发事件，因此预览组件需要单独提供给开发者使用。预览组件作为 Image 的内部组件，开发者能够以Image.Preview、Image.PreviewGroup的方式使用，并提供左右切换、图片缩放等功能，用户可以通过 srcList、visible、actions、scales等API来控制并定制化预览组件。
    
    - 规范的 API 编写

        - 减少必填的API项
        - 使用通用且有意义的API命名：
        
            - onXXX：命名监听/触发方法
            - renderXXX：命名渲染方法
            - xxxProps：命名子组件属性
            - 优先使用常见单词进行命名，如：value、visible、size、disabled、label、type等等

        - 提供类型模块供外部使用
        - 在类型文件中，为API编写注释；

    - [Slot] 与 [Props] 的选择

        例如：Card 组件一种方式是将 head、content、footer 的内部组件属性全部以 Card 组件的属性传递进去，另外一种方式是使用插槽的方式编写

- 可扩展性

    - 预设好插槽供外部扩展
    - 通过作用域插槽来提供更高灵活度的扩展
    - 布尔类型和枚举类型的选择
    
        例如：选择器的类型："single" | "multiple" | "cascader" | "region" | "time"，对比布尔属性扩展性更强

    - Headless UI：Headless UI 是基于 React Hooks 的组件开发设计理念，强调只负责组件的状态及交互逻辑，不关注组件的样式实现。

        - 将组件划分为多个原子组件，使用者可以通过填充组件或修改样式的方式来实现自己的需求
        - 以Hooks的方式暴露内置交互功能的子组件属性，使用者可以将这些属性应用于任意组件上，由于没有将样式封装到组件中，Headless组件实现了最大程度的视图层可扩展性。

    - 预留 class、style 或 CSS 变量来定制样式，避免直接使用内部选择器修改

参考

- [浅谈前端组件设计](https://mp.weixin.qq.com/s?__biz=MzI2MjcxNTQ0Nw==&mid=2247502829&idx=1&sn=d641fcca397998c59b7b5c842bd13222)

## 框架

- [open-ui](https://github.com/openui/open-ui) - Maintain an open standard for UI and promote its adherence and adoption.
- [ui-playbook](https://github.com/raunofreiberg/ui-playbook) - The documented collection of UI components 

---

- 配色
- 排版

    - 主体
    - 标题
    - 段落
    - 文本
    - 地址
    - 引用
    - 列表
    - 代码
    - 图片

- 组件

    - 基础

        - 按钮
        - 图标

    - 布局

        - 栅格系统

    - 导航

        - 固钉
        - 分页
        - 面包屑
        - 标签页
        - 步骤条
        - 回到顶部
        - 下拉菜单
        - 导航菜单

    - 输入

        - 表单
        - 开关
        - 上传
        - 评分
        - 输入框
        - 单选框
        - 多选框
        - 选择器
        - 树选择
        - 日期选择框
        - 时间选择框

    - 展示

        - 卡片
        - 面板
        - 日历
        - 表格
        - 巨幕
        - 媒体
        - 徽标
        - 标签
        - 走马灯

    - 反馈

        - 加载中：同于异步数据加载或异步操作提示
        - 进度条：略
        - 信息框：用于异步操作（通常是数据加载）结束后，在页面内显示结果信息
        - 提示框：用于异步操作（通常是表单提交）结束后，全局显示可自动关闭的结果信息
        - 警告框：只有一个确认按钮的弹出框
        - 确认框：存在确认和取消这两个按钮的弹出框
        - 模态框：略
        - 通知提醒框：略
        - 气泡卡片：在模板元素附近显示的信息框
        - 气泡提示框：在目标元素附近显示的提示框，移出鼠标后隐藏提示框
        - 气泡确认框：在目标元素附近弹出的确认框，相比确认框交互更加友好

    - 辅助

        - 国际化
        - 响应式
        - 浮动清除
        - 文本对齐
        - 文本大小写

参考

- [这个控件叫什么](https://www.zhihu.com/column/c_87416856) - 

## 实现

- [前端组件化开发实践](http://web.jobbole.com/82689/)
- [大规模的前端组件化与模块化](http://www.infoq.com/cn/news/2014/04/front-end-modular)
- [UI Play Book](https://uiplaybook.dev/) - Compilation of documents for building UI components.
- [Notes on maintaining an internal React component library](https://www.gabe.pizza/notes-on-component-libraries/)
