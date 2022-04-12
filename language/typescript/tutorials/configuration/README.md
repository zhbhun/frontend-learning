# [配置](https://www.typescriptlang.org/tsconfig)

## 基础

### [isolatedModules](https://www.typescriptlang.org/tsconfig#isolatedModules)

问题：一些编译器，例如 babel 和 ts.transpileModule，在编译的时候同时只能处理一个文件，而不能处理依赖全局类型系统的代码，所以编译时会遇到错误。

    在 TS 中，你可以引入一个类型，并重新导出，如下所示：

    ```ts
    import { someType, someFunction } from "someModule";

    someFunction();
 
    export { someType, someFunction };
    ```

    因为 someType 只是一个 TS 类型，JS 实际运行时并不存在该值，而像 babel 这样的单文件编译器无法知道 someType 是否是一个 TS 类型还是 JS 值，编译后会保留 someType 的导出，所以在运行编译后的代码会报错。

解决：为了规避该问题，在使用 babel 这样的单文件编译器的时候，需要开启 TS 的 isolatedModules，这样 TS 会对这样代码做相关的警告
