- Hermes 

  - 字节码预编译

    减少了运行时的解析和编译时间，提高了代码执行效率

  - 放弃 JIT

    有助于减少内存占用。此外，优化了引擎的内存管理，减少了内存泄漏的可能性。

- JavaScript Interface(JSI)

  个轻量级的 C++ 框架，它允许 JavaScript 引擎与 C++ 代码之间进行直接交互。用于提高 JavaScript 和原生代码之间的通信效率。通过 JSI，JavaScript 对象可以直接获取 C++ 对象（Host Objects）的引用，并调用其方法。这种方法减少了序列化和反序列化的开销，提高了方法调用的效率。JSI 提供了类型检查和同步调用的能力，使得跨语言的调用更加安全和方便。

- Fabric

  Fabric 是一个用于提高应用性能和简化开发流程的组件。它允许开发者以更模块化的方式构建应用，通过提供一套工具和服务来优化应用的启动时间和内存使用。Fabric 旨在简化 React Native 应用的开发和维护，提高性能，并提供更好的用户体验。

- Turbo Modules

  Turbo Modules 是 Native Modules 的升级版。Turbo Modules 基于 JSI 开发，提供了一种轻量级的框架，用于解决在使用 Native Modules 时遇到的问题。Turbo Modules 支持懒加载，这意味着它们在需要时才会被加载，从而减少了应用的启动时间。此外，Turbo Modules 提供了更好的类型检查和接口一致性，使得 JavaScript 和原生代码之间的交互更加安全和高效。

- CodeGen

  CodeGen 是一个工具，它用于自动化地生成 JavaScript 和原生代码之间的接口代码。在 React Native 的新架构中，CodeGen 通过使用静态类型检查器（如 Flow 或 TypeScript）来确保 JavaScript 侧和原生侧的接口一致性。CodeGen 可以自动生成所需的接口文件，从而加速了通信过程，因为不需要在每次调用时都进行数据验证。这有助于提高开发效率，并减少因类型不匹配导致的错误。

## 示例

- Facebook 官方提供的数据显示，使用 Hermes 后，应用的 TTI 从 4.3 秒减少到 2.01 秒，下载大小从 41MB 减少到 22MB，内存占用从 185MB 减少到 136MB。

## 参考文献

- [Deep dive into React Native’s New Architecture](https://medium.com/coox-tech/deep-dive-into-react-natives-new-architecture-fb67ae615ccd)
- https://github.com/reactwg/react-native-new-architecture
