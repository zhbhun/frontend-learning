# [3.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html)

## Type-Only Imports and Export

支持如下所示的方式引入 TS 类型，并导出该类型，可以解决 babel 这类单文件编译器无法识别类型导入和导出的问题。

```ts
import type { SomeThing } from "./some-module.js";
export type { SomeThing };
```
