# Flutter 组件化开发

- 介绍组件
  - 声明式编程 VS 命令式编程
  - 有状态 VS 无状态
  - 短时状态 VS 应用状态
  - 组件生命周期
  - 一个示例
- 代码复用
  - 高阶组件
  - hook
- 组件通信
- 状态管理
  - provide
  - redux
  - mbox
  - rx
- 实践优化
  - 所有代码都参杂在一起的命令式编程
  - 所有代码都参杂在一起的声明式编程
  - 组件划分：有状态 VS 无状态、局部状态 VS 应用状态
  - 代码复用
  - 状态管理：实现组件通信

## 介绍组件

### 声明式编程 VS 命令式编程

从 Win32 到 Web 再到 Android 和 iOS，原生的开发通常是采用一种命令式的编程风格来完成 UI 编程。这可能是你最熟悉的风格 — 你手动构建一个全功能的 UI 实例，比如一个 UIView 或其他类似的，在随后 UI 发生变化时，使用方法或 Setter 修改它。为了减轻开发人员的负担，无需编写如何在不同的 UI 状态之间进行切换的代码， Flutter 相反，让开发人员描述当前的 UI 状态，并将转换交给框架。—— 既然声明式编程那么好，为什么平台不直接提供声明式编程方式呢？

- 命令时编程 （Imperative） ：详细的命令机器怎么去处理一件事情以达到你想要的结果。

    命令时编程方式来实现 UI 时，需要在不同的 UI 状态之间进行代码切换：在初始化时采用命令式的创建界面，然后获得相关 UI 控件的引用，在处理响应事件时需要调用相应的业务逻辑和手动的修改 UI（命令式的）。—— UI 和控制逻辑耦合在一起，而且分散在不同的地方。

- 声明式编程（ Declarative）：只告诉你想要的结果，机器自己摸索过程。

    声明式编程给我的最大感受是：UI 和控制逻辑是解耦的（它们之间的同步交给框架处理），UI 渲染放在一个约定的函数里构建，它只接受父层组件传过来的属性和自身管理的状态，当处理相关事件需要刷新 UI 时，我们只需要修改相应的状态即可，Flutter 框架本身会帮我们处理 UI 和状态的同步。—— 这些 UI 构建函数与控制逻辑解耦，就像函数式编程里的“纯函数”，不存在副作用，只要是同样的属性和状态输入就会渲染输出同样的界面。

![ui-equals-function-of-state.png](./assets/ui-equals-function-of-state.png)

![state-management-explainer.gif](./assets/state-management-explainer.gif)

---

示例

![declarativeUIchanges.png](./assets/declarativeUIchanges.png)

在命令式风格中，你通常需要使用选择器 `findViewById` 或类似函数获取到 ViewB 的实例 `b` 和所有权，并调用相关的修改的方法（并隐式的使其失效）。例如： 

```
// Imperative style
b.setColor(red)
b.clearChildren()
ViewC c3 = new ViewC(...)
b.add(c3)
```

 在声明式风格中，视图配置是不可变的，它只是轻量的“蓝图”。要改变 UI，Widget 会在自身上触发重建（在 Flutter 中最常见的方法是在 StatefulWidgets 组件上调用 `setState()`）并构造一个新的 Widget 子树。 

```
// Declarative style
return ViewB(
  color: red,
  child: ViewC(...),
)
```

---

**工作原理**

TODO

---

参考文献**

- [Introduction to declarative UI](https://flutter.dev/docs/get-started/flutter-for/declarative)
- [Start thinking declaratively](https://flutter.dev/docs/development/data-and-backend/state-mgmt/declarative)
- [声明式编程和命令式编程有什么区别？](https://www.zhihu.com/question/22285830)
- [未来属于声明式编程](https://lutaonan.com/blog/declarative-programming-is-the-future/)

### 有状态 VS 无状态

在 Flutter 中，所有 UI 都是 Widget 构成的，但并不是所有的 Widget 都是有状态的，有些 Widget 也是无状态的。例如：Icon、IconButton 和 Text 等都是无状态的。而有状态的 Widget 可以通过与用户的交互或是随着数据的改变而导致外观形态的变化，如：Checkbox、Radio 和 Slider 等。

- 无状态：继承 StatelessWidget
- 有状态：集成 StatefulWidget

思考：一个复杂界面通常可以拆分为多个有状态和无状态 Widget，当然也可以写一个超级 Widget，然后将不同的逻辑划分在该 Widget 的不同 build 函数里。但在需要代码复用和优化代码可读性的时候，我们就需要按是否有状态来拆解出不同的子 Widget。

参考文献

- [Stateful and stateless widgets](https://flutter.dev/docs/development/ui/interactive)
- [State management](https://flutter.dev/docs/development/data-and-backend/state-mgmt/intro)

### 局部状态 VS 应用状态

- 局部状态（Ephemeral State）：也叫 UI 状态或者临时状态， 是可以完全包含在一个独立 widget 中的状态。 

  例如：Dropdown 的下拉选择列表开启或关闭状态、一个 PageView 组件中的当前页面，这些就是局部状态，其他 Widget 不需要访问这种状态，也不要使用状态管理架构去管理这种状态（当让在 React & Redux 领域曾经就有人尝试这么干过，实际上时没必要的）。

- 应用状态：如果你想在你的应用中的多个部分之间共享一个非短时的状态，并且在用户会话期间保留这个状态，我们称之为应用状态。 

  例如：用户登录信息、社交通知、电商购物车等。

选择局部状态就还是应用状态，取决于你的应用的复杂度和限制。而且这取决于你的应用复杂度和限制，例如：在一个特定的应用中，一个 PageView 组件的当前页面不是局部状态，你可能需要在 PageView 外部来改变这个值，并在应用运行期间保留它。

没有一个明确、普遍的规则来区分一个变量属于短时状态还是应用状态，有时你不得不在此之间重构。比如，刚开始你认为一些状态是短时状态，但随着应用不断增加功能，有些状态需要被改变为应用状态。无论你的业务怎么变化，请有保留地遵循以下这张流程图： 

![ephemeral-vs-app-state.png](./assets/ephemeral-vs-app-state.png)

参考文献

- [Differentiate between ephemeral state and app state](https://flutter.dev/docs/development/data-and-backend/state-mgmt/ephemeral-vs-app)

### 组件生命周期

TODO

### 一个示例