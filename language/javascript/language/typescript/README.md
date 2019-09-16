# [TypeScript](http://www.typescriptlang.org)

- https://www.tslang.cn/
- [GitHub](https://github.com/Microsoft/TypeScript)
- [Twitter](https://twitter.com/typescript/)
- [StackOverflow](https://stackoverflow.com/questions/tagged/typescript)
- [Blog](https://devblogs.microsoft.com/typescript/)
- [Changelog](http://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-5.html)
- [Specification](https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md)

## 安装

- [TypeScript in 5 minutes](http://www.typescriptlang.org/docs/handbook/typescript-in-5-minutes.html)
- [CLI](http://www.typescriptlang.org/index.html#download-links)
- [Playground](http://www.typescriptlang.org/play/index.html)

## 语法

- [TypeScript Handbook](http://www.typescriptlang.org/docs/handbook/basic-types.html)

### [基础数据类型](http://www.typescriptlang.org/docs/handbook/basic-types.html)

- Boolean

    ```ts
    let isDone: boolean = false;
    ```

- Number

    ```ts
    let decimal: number = 6;
    let hex: number = 0xf00d;
    let binary: number = 0b1010;
    let octal: number = 0o744;
    ```

- String

    ```ts
    let color: string = "blue";
    color = 'red';
    ```

- Array

    ```ts
    let list: number[] = [1, 2, 3];
    let list: Array<number> = [1, 2, 3];
    ```

- Tuple

    ```ts
    let x: [string, number];
    x = ["hello", 10];
    ```

- [Enum](http://www.typescriptlang.org/docs/handbook/enums.html)

    ```ts
    enum Color {Red, Green, Blue}
    let c: Color = Color.Green;
    ```

    - 数值
    - 字符串
    - 混合
    - 计算
    - 类型
    - 运行时
    - 编译时

- Any

    ```ts
    let notSure: any = 4;
    notSure = "maybe a string instead";
    notSure = false; // okay, definitely a boolean
    ```

- Void

    ```ts
    function warnUser(): void {}
    ```

- Null / Undefined

    ```ts
    let u: undefined = undefined;
    let n: null = null;
    ```

- Never
- Object
- Assertions：断言

    ```ts
    let someValue: any = "this is a string";
    let strLength: number = (<string>someValue).length;
    ```

- [Symbol](https://www.tslang.cn/docs/handbook/symbols.html)

### [变量声明](http://www.typescriptlang.org/docs/handbook/variable-declarations.html)

...

### [接口](http://www.typescriptlang.org/docs/handbook/interfaces.html)

...

### [类](http://www.typescriptlang.org/docs/handbook/classes.html)

- 声明类
- 继承
- 修饰符：`public`、`private`、`protected` 和 `readonly`
- 存储器和访问器
- 静态属性
- 抽象类

### [函数](http://www.typescriptlang.org/docs/handbook/functions.html)

- 声明函数：命名、匿名、作用域
- 函数类型：类型化函数、函数类型
- 函数参数：可选、默认、Rest

### [泛型](http://www.typescriptlang.org/docs/handbook/generics.html)

- 泛型函数

    ```ts
    function identity<T>(arg: T): T {
      return arg;
    }
    ```

- 泛型类型

    ```ts
    function identity<T>(arg: T): T {
      return arg;
    }
    let myIdentity: <T>(arg: T) => T = identity;
    ```

    ```ts
    interface GenericIdentityFn {
      <T>(arg: T): T;
    }
    function identity<T>(arg: T): T {
      return arg;
    }
    let myIdentity: GenericIdentityFn = identity;
    ```

    ```ts
    interface GenericIdentityFn<T> {
      (arg: T): T;
    }
    function identity<T>(arg: T): T {
      return arg;
    }
    let myIdentity: GenericIdentityFn<number> = identity;
    ```

- 泛型类

    ```ts
    class GenericNumber<T> {
      zeroValue: T;
      add: (x: T, y: T) => T;
    }
    ```

- 泛型约束

    ```ts
    interface Lengthwise {
      length: number;
    }
    function loggingIdentity<T extends Lengthwise>(arg: T): T {
      console.log(arg.length);
      return arg;
    }
    ```

    - 参数类型

        ```ts
        function getProperty<T, K extends keyof T>(obj: T, key: K) {
          return obj[key];
        }
        ```

    - Class 类型

        ```ts
        function create<T>(c: {new(): T; }): T {
          return new c();
        }
        ```

        ```ts
        function create<T>(c: new () => T): T {
          return new c();
        }
        ```

### 其他

- [类型推导](http://www.typescriptlang.org/docs/handbook/type-inference.html)
- [类型兼容](http://www.typescriptlang.org/docs/handbook/type-compatibility.html)

## 应用

- [Quick Start](http://www.typescriptlang.org/samples/)
- [Migrating from JavaScript](http://www.typescriptlang.org/docs/handbook/migrating-from-javascript.html#gulp)

### Babel

- [TypeScript-Babel-Starter](https://github.com/Microsoft/TypeScript-Babel-Starter#readme)

### Gulp

- [Gulp](http://www.typescriptlang.org/docs/handbook/gulp.html)

### Webpack

- [ts-loader](https://github.com/TypeStrong/ts-loader)
- [awesome-typescript-loader](https://github.com/s-panferov/awesome-typescript-loader)
- [React & Webpack](http://www.typescriptlang.org/docs/handbook/react-&-webpack.html)

### React

- [TypeScript-React-Starter](https://github.com/Microsoft/TypeScript-React-Starter#typescript-react-starter)
- [create-react-app](https://github.com/Microsoft/TypeScript-Handbook/blob/master/pages/tutorials/React.md)
- [TypeScript-React-Conversion-Guide](https://github.com/Microsoft/TypeScript-React-Conversion-Guide)

### Node

- [TypeScript Node Starter](https://github.com/Microsoft/TypeScript-Node-Starter#typescript-node-starter)

## 问题

### Could not find a declaration file for module 'xxx'?

- [Could not find a declaration file for module 'module-name'. '/path/to/module-name.js' implicitly has an 'any' type](https://stackoverflow.com/questions/41292559/could-not-find-a-declaration-file-for-module-module-name-path-to-module-nam)

## TODO

- [TypeScript](http://www.typescriptlang.org)
- [TypeScriptSamples](https://github.com/Microsoft/TypeScriptSamples)
- [TypeScript Language Specification](https://github.com/Microsoft/TypeScript/blob/master/doc/spec.md)
- [TypeScript Handbook](https://zhongsp.gitbooks.io/typescript-handbook/content/)
- [TypeScript 入门教程](https://ts.xcatliu.com/introduction/hello-typescript.html)
- [来玩TypeScript啊，机都给你开好了！](https://zhuanlan.zhihu.com/c_206498766)
