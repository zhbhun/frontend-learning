# GPUI

- 1. 上手
  - [1.1 安装与运行](cheatsheets/install-and-run/README.mdx)
    建 gpui 与 gpui_platform 工程，跑通第一个窗口。
  - [1.2 窗口与首个界面](cheatsheets/window-and-view/README.mdx)
    用 Render trait 和 div 写出声明式界面，配置 WindowOptions。
  - [1.3 状态与重渲染](cheatsheets/state-and-rerender/README.mdx)
    用 Entity 持有状态，理解 cx.notify() 驱动的重渲染循环。
- 2. 布局与样式
  - [2.1 Flex 布局](cheatsheets/flex-layout/README.mdx)
    主轴交叉轴、对齐、间距与嵌套布局。
  - [2.2 尺寸体系](cheatsheets/sizing/README.mdx)
    px、rem、relative、percentage、fraction 与 full 的选用。
  - [2.3 网格与容器查询](cheatsheets/grid-and-container-queries/README.mdx)
    grid_cols、col_span 与 container_query 响应式布局。
  - [2.4 颜色与视觉](cheatsheets/colors-and-visuals/README.mdx)
    Hsla/Rgba、边框圆角、阴影、渐变与透明度。
  - [2.5 文本与字体](cheatsheets/text-and-fonts/README.mdx)
    文本样式、字体选择、换行与文本布局。
- 3. 交互
  - [3.1 鼠标事件](cheatsheets/mouse-events/README.mdx)
    on_click 与鼠标事件处理、hover 状态与光标。
  - [3.2 动作与快捷键](cheatsheets/actions-and-keybindings/README.mdx)
    actions!、KeyBinding 与按键分发流程。
  - [3.3 焦点管理](cheatsheets/focus/README.mdx)
    FocusHandle、焦点上下文与 Tab 导航。
  - [3.4 拖放](cheatsheets/drag-and-drop/README.mdx)
    拖拽数据传递与放置目标处理。
  - [3.5 文本输入](cheatsheets/text-input/README.mdx)
    文本输入框与受控输入状态。
- 4. 架构核心
  - [4.1 Context 体系](cheatsheets/contexts/README.mdx)
    App、Context、AsyncApp 等上下文的能力划分与借用规则。
  - [4.2 Entity 与数据流](cheatsheets/entities-and-data-flow/README.mdx)
    Entity 所有权模型、observe/subscribe、WeakEntity 与 Global。
  - [4.3 自定义 Element](cheatsheets/custom-elements/README.mdx)
    Element trait 协议、request_layout 与 paint 的实现。
  - [4.4 异步与执行器](cheatsheets/async-executor/README.mdx)
    前后台执行器、Task 与异步任务和 UI 的通信。
  - [4.5 多窗口](cheatsheets/multi-window/README.mdx)
    WindowHandle 管理、跨窗口移动 Entity 与窗口事件。
- 5. 实战能力
  - [5.1 列表与滚动](cheatsheets/lists-and-scrolling/README.mdx)
    List、UniformList 与滚动容器、虚拟化渲染。
  - [5.2 自定义绘制](cheatsheets/custom-painting/README.mdx)
    路径、Canvas 与底层绘制 API。
  - [5.3 动画](cheatsheets/animation/README.mdx)
    动画系统、easing 与过渡效果。
  - [5.4 图片与资源](cheatsheets/images-and-assets/README.mdx)
    Img、Svg 与资产加载。
  - [5.5 复杂示例导读](cheatsheets/advanced-examples/README.mdx)
    popover、data_table、tree 等官方复合示例的组织方式。
- 6. 工程化
  - [6.1 测试](cheatsheets/testing/README.mdx)
    gpui::test、TestAppContext 与交互测试。
  - [6.2 无障碍](cheatsheets/accessibility/README.mdx)
    AccessKit 集成与可访问性属性。
  - [6.3 系统集成](cheatsheets/system-integration/README.mdx)
    应用菜单、系统通知、窗口外观与平台差异。
  - [6.4 性能实践](cheatsheets/performance/README.mdx)
    notify 粒度、重绘范围与渲染性能。
- 7. 生态实践
  - [7.1 gpui-kit 入门](cheatsheets/gpui-kit-intro/README.mdx)
    gpui-component 与 gpui-base 分层、安装与主题系统。
  - [7.2 基础组件](cheatsheets/gpui-kit-basic-components/README.mdx)
    按钮、输入、选择等表单组件的用法。
  - [7.3 数据表格](cheatsheets/gpui-kit-data-table/README.mdx)
    虚拟滚动、列配置、排序与选择。
  - [7.4 Dock 布局](cheatsheets/gpui-kit-dock/README.mdx)
    面板拆分、可拖拽标签页与布局序列化。
  - [7.5 编辑器与富内容](cheatsheets/gpui-kit-editor/README.mdx)
    代码编辑器、语法高亮与 Markdown 渲染。
  - [7.6 Zed ui crate 与源码阅读](cheatsheets/zed-ui-crate/README.mdx)
    Zed 的组件层与 gpui 源码的阅读路径。
