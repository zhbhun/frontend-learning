# cordis

- 1. 上手
  - [1.1 认识 cordis](cheatsheets/intro/README.mdx)
    元框架定位、时空可组合性两大维度、官方生态包一览与 Koishi 渊源。
  - [1.2 安装与运行](cheatsheets/getting-started/README.mdx)
    create-cordis 脚手架、官方 boilerplate 与最小可运行应用。
  - [1.3 工程组织](cheatsheets/project-structure/README.mdx)
    插件工作区结构、构建脚本与发布流程。

- 2. 核心概念
  - [2.1 插件](cheatsheets/plugins/README.mdx)
    函数式插件的结构、apply(ctx, config) 与插件的注册和销毁。
  - [2.2 上下文](cheatsheets/context/README.mdx)
    Context 作为服务容器的作用域模型与上下文树。
  - [2.3 服务](cheatsheets/services/README.mdx)
    Service 基类、服务声明合并与服务的实现和消费。
  - [2.4 依赖注入](cheatsheets/dependency-injection/README.mdx)
    inject 声明、依赖就绪时机与用依赖表达加载顺序。
  - [2.5 生命周期](cheatsheets/lifecycle/README.mdx)
    插件加载、重载与销毁的完整流程和时机钩子。
  - [2.6 配置](cheatsheets/config/README.mdx)
    插件配置定义、Standard Schema 校验与配置读取。

- 3. 副作用与事件
  - [3.1 可逆副作用](cheatsheets/effects/README.mdx)
    ctx.effect() 与 disposer——插件移除时副作用如何完全撤销。
  - [3.2 事件](cheatsheets/events/README.mdx)
    类型化事件的注册、触发与事件名声明合并。
  - [3.3 分发模式](cheatsheets/dispatch-modes/README.mdx)
    emit、parallel、serial、bail、waterfall 五种分发方法的语义与选择依据。

- 4. Fiber 与设计理念
  - [4.1 Fiber](cheatsheets/fiber/README.mdx)
    cordis 4 的 effect 运行时载体与同步、异步 effect 的处理。
  - [4.2 设计理念](cheatsheets/philosophy/README.mdx)
    时空可组合性的动机、context 模型与框架哲学。

- 5. 加载器与工程化
  - [5.1 加载器](cheatsheets/loader/README.mdx)
    plugin-loader 的配置驱动组装与配置调和。
  - [5.2 分组与热重载](cheatsheets/group-and-hmr/README.mdx)
    group、include 插件与 HMR 热重载工作流。
  - [5.3 官方插件](cheatsheets/official-plugins/README.mdx)
    timer、logger、webui 等官方生态包速查。

- 6. 进阶
  - [6.1 论文导读](cheatsheets/paper/README.mdx)
    revertible effects、reactive coeffects 与 context type 的形式化表述。
  - [6.2 源码导读](cheatsheets/source-code/README.mdx)
    core 包模块结构、关键实现路径与测试用例阅读方法。
  - [6.3 TypeScript 模式](cheatsheets/ts-patterns/README.mdx)
    declaration merging、reflect 工具与类型安全的服务接口设计。
