# Tiptap

- 1. 上手
  - [1.1 是什么](cheatsheets/what-is-tiptap/README.mdx)
    headless 编辑器的含义、与 ProseMirror 的关系、v3 的包生态与许可结构。
  - [1.2 安装](cheatsheets/install/README.mdx)
    原生 JS、React、Vue 三条安装路径与 `@tiptap/core`、`@tiptap/pm`、`@tiptap/starter-kit` 的包职责。
  - [1.3 第一个编辑器](cheatsheets/first-editor/README.mdx)
    创建编辑器、挂载初始内容、切换可编辑状态与销毁清理。
  - [1.4 配置](cheatsheets/configure/README.mdx)
    extensions、content、editable、autofocus、editorProps 等常用选项的取值与效果。
  - [1.5 样式](cheatsheets/style-editor/README.mdx)
    编辑区 DOM 结构、ProseMirror 官方类名体系、占位符与深色模式等外观定制。

- 2. 内容与命令
  - [2.1 内容与文档模型](cheatsheets/content-model/README.mdx)
    HTML 与 JSON 的输入输出、文档树的层级结构、schema 约束下的合法内容。
  - [2.2 命令](cheatsheets/commands/README.mdx)
    命令链的组装与执行、insertContent 插入结构化内容、调用扩展注册的命令。
  - [2.3 选区与焦点](cheatsheets/selection/README.mdx)
    文本选区与节点选区的读写、焦点控制与滚动定位。
  - [2.4 事件](cheatsheets/events/README.mdx)
    生命周期事件与 transaction 监听，从回调参数里读取最新文档状态。

- 3. 常用扩展
  - [3.1 文本样式扩展](cheatsheets/text-style-extensions/README.mdx)
    bold、underline 等 mark 类扩展与 text-style 家族（颜色、字号、字体、行高、对齐、高亮、链接）。
  - [3.2 结构扩展](cheatsheets/content-extensions/README.mdx)
    列表、表格、代码块、图片、引用等节点类扩展的配置、嵌套与相互组合。
  - [3.3 行为扩展](cheatsheets/behavior-extensions/README.mdx)
    placeholder、character-count、undo-redo、unique-id 等不改变内容形态的功能扩展。
  - [3.4 菜单](cheatsheets/menus/README.mdx)
    bubble-menu 与 floating-menu 的显示条件、定位策略与原生实现。

- 4. 原理与自定义
  - [4.1 Schema、节点与标记](cheatsheets/schema-nodes-marks/README.mdx)
    文档模型原理、node 与 mark 的职责差异、parseHTML/renderHTML 与 attributes 定义。
  - [4.2 Extension 体系](cheatsheets/extension-system/README.mdx)
    Extension、Node、Mark 三类扩展的构成要素、extendExisting 与 options/storage 机制。
  - [4.3 快捷键与输入规则](cheatsheets/keyboard-input-rules/README.mdx)
    addKeyboardShortcuts 快捷键绑定与 Markdown 式输入、粘贴规则。
  - [4.4 自定义 Node 与 Mark](cheatsheets/custom-node-mark/README.mdx)
    从零编写节点与标记扩展，注册命令、补全类型并在编辑器中验证。
  - [4.5 Node View 与 Mark View](cheatsheets/node-views/README.mdx)
    用自管 DOM 渲染复杂节点，处理嵌套内容、事件交互与生命周期。
  - [4.6 Decorations 与插件](cheatsheets/decorations-plugins/README.mdx)
    ProseMirror 装饰器与 addProseMirrorPlugins，作为扩展体系的底层逃生口。

- 5. 生产化
  - [5.1 输出与静态渲染](cheatsheets/output-rendering/README.mdx)
    generateHTML/generateJSON、StaticRenderer 与服务端内容的回显。
  - [5.2 TypeScript](cheatsheets/typescript/README.mdx)
    自定义扩展的类型声明、Commands 接口合并与内容类型约束。
  - [5.3 性能](cheatsheets/performance/README.mdx)
    大文档、更新频率、扩展裁剪与常见性能陷阱的定位。
  - [5.4 无障碍与输入细节](cheatsheets/accessibility/README.mdx)
    可访问性配置、拼写检查、输入法与移动端输入的注意点。
  - [5.5 升级与迁移](cheatsheets/upgrade-migration/README.mdx)
    v2 到 v3 的升级清单与从其他编辑器迁移的评估入口。

- 6. 框架集成与生态
  - [6.1 React 集成](cheatsheets/react/README.mdx)
    useEditor/EditorContent 的用法、SSR 注意点与 React 版 Node View。
  - [6.2 Vue 集成](cheatsheets/vue/README.mdx)
    vue-3 绑定的用法以及与 React 版本的概念差异对照。
  - [6.3 UI Components](cheatsheets/ui-components/README.mdx)
    官方菜单组件库的安装、目录结构与接入编辑器的方式。
  - [6.4 Markdown](cheatsheets/markdown/README.mdx)
    `@tiptap/markdown` 的输入输出、自定义解析与序列化。

- 7. 实时协作
  - [7.1 协作入门](cheatsheets/collaboration/README.mdx)
    Yjs 文档模型、extension-collaboration 与 provider 的组合方式。
  - [7.2 Hocuspocus 后端](cheatsheets/hocuspocus/README.mdx)
    自托管协作服务、鉴权、持久化与服务端扩展点。
  - [7.3 协作体验](cheatsheets/collaboration-ux/README.mdx)
    协作光标、在线状态与多人冲突场景下的体验细节。

- 8. 付费产品线
  - [8.1 付费能力概览](cheatsheets/paid-products/README.mdx)
    AI Toolkit、Comments、Conversion 等商业能力地图、许可方式与选型判断。
