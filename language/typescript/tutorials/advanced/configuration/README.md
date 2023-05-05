# [配置](https://www.typescriptlang.org/tsconfig)

## 模块

### allowSyntheticDefaultImports 和 esModuleInterop

存在问题

```js
// input
import * as fs from "fs";
import _ from "lodash";
fs.readFileSync("file.txt", "utf8");
_.chunk(["a", "b", "c", "d"], 2);

// output
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const lodash_1 = require("lodash");
fs.readFileSync("file.txt", "utf8");
lodash_1.default.chunk(["a", "b", "c", "d"], 2);
```

- `import _ from "lodash"` => `const _ = require("lodash").default`

    moment 模块是 commonjs 格式的，模块并没有导出 default，所以这里的 moment 的值是 undefined

- `import * as fs from "fs"` => `const fs = require("fs")`

    按照 ES Module 的规范，使用命名空间导入（`import * as x`）的值必须是对对象，但是转译为 commonjs 后，导入的有可能是一个函数。

解决方案

- `esModuleInterop`：true

    开启后会自动处理导入 commonjs 的模块
    
    - 针对默认导入，会对 commonjs 模块会包一层对象，将原有的导入值放入到 default 里
    - 针对命名空间导入，会将 commonjs 模块导入值的 key 拷贝到一个新的对象上

    ps：只有在 target 设置为 commonjs 才会生效

- `allowSyntheticDefaultImports`：true

```js
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
fs.readFileSync("file.txt", "utf8");
lodash_1.default.chunk(["a", "b", "c", "d"], 2);
```

参考文献

- [由 allowSyntheticDefaultImports 引起的思考](https://blog.leodots.me/post/40-think-about-allowSyntheticDefaultImports.html)

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

## 基础

### [noImplicitAny](https://www.typescriptlang.org/tsconfig#noImplicitAny)

- 说明：`noImplicitAny` 控制是否支持隐式的 any

    - 关闭：支持隐式的 any，即如果未指定类型的变量或常量无法通过上下文推断出类型，编译器一般会默认为 any 类型；
    - 开启：未指定类型的变量或常量在无法通过上下文推断出类型时，必须手动设定 any 类型。

- 案例：

    - 关闭时函数参数默认是 any 类型，开启后必须为函数参数设置类型
    - ...

### [strictNullChecks](https://www.typescriptlang.org/tsconfig#strictNullChecks)

- 说明：`strictNullChecks` 用于控制空值检查开关

    - 关闭：`null` 和 `undefined` 被忽略了（认为是 any 类型）
    - 开启：`null` 和 `undefiend` 拥有自己的类型

- 案例

    - 关闭时 `null` 和 `undefined` 可以赋值给任意变量，开启后不再允许
    - 关闭时调用函数获得的返回值 `null` 和 `undefined` 会被忽略，开启后不会

## 进阶

### 三斜线指令

使用场景：在没有使用模块化系统，或者没有配置文件和命令行时，可以使用三斜线来引入外部依赖。

- [Triple-Slash Directives](https://www.typescriptlang.org/docs/handbook/triple-slash-directives.html)
- [When do I need a triple slash reference?](https://stackoverflow.com/questions/22684802/when-do-i-need-a-triple-slash-reference)
