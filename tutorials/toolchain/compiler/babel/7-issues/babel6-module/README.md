测试 babel6 如何编译 ES 和 CommonJS 模块化代码。

备注：本文测试的是模块化代码转译为 CommonJS 规范的情况。

# 示例
代码结构

- ./.babelrc - 配置文件
- ./src/commonjs-exports.js - 以 CommonJS Exports 方式输出
- ./src/commonjs-module-exports.js - 以 CommonJS Module Exports 方式输出
- ./src/commonjs-require.js - 以 CommonJS require 方式引入
- ./src/es-export.js - 以 ES Export 方式输出
- ./src/es-export-default.js - 以 ES Export Default 方式输出
- ./src/es-export-and-default.js - 以 ES Export 和 Export Default 方式输出
- ./src/es-import.js - 以 import 方式引入
- ./src/es-import-*.js - 以 `import * as` 方式引入
- ./src/es-import-destruction.js -以 import 解构方式引入 

运行示例

1. `yarn install`：安装依赖
2. `npm run build`：编译代码，观察生成的文件，与源代码进行对比
3. `node ./lib/index`：运行编译代码，观察日志信息

总结

- Babel6 不转译 CommonJS 规范的模块化代码 `exports`，`module.exports` 和 `require`；
- Babel6 转译 ES 模块输出时，以 CommonJS `exports` 属性的方式输出，并且添加了属性 `exports.__esModule`，作为 ES 模块化的标识；

    - `export const xxx = value` 转译为 `var xxx = exports.xxx = value`
    - `export default { xxx: value }` 转译为 `exports.default = { xxx: value }` 

- Babel6 转译 ES 模块引入时，按下面的规则处理

    - `import xxx from './moduleName'`
    
        1. 转译为 CommonJS 的 require，即 `var _moduleName = require('./moduleName')`；
        2. 对引入的模块变量使用工具函数 `_interopRequireDefault` 处理，如果不是 ES 模块输出（__esModule 不是 true），将引入的模块值封装到新对象的 `default` 属性里，即 `var _moduleName2 = _interopRequireDefault(_moduleName)`；
        3. 模块调用代码均转译为 `_moduleName2.default` 的形式

        由于 ES export 输出没有 default，所以返回 undefined，具体代码可参考 `./lib/es-import.js`。
         
    - `import { xxx } from './moduleName'`

        1. 转译为 CommonJS 的 require，即 `var _moduleName = require('./moduleName')`；
        2. 模块调用代码直接转译为 `_moduleName.xxx` 的形式

        由于 `export default` 的输出都在 default 属性上，所以返回值是 undefined，具体代码可参考 `./lib/es-import-destruction.js`

    - `import xxx { xxx1 } from './moduleName'`

        - 混合上面的转译处理
        - xxx 转译为 `_moduleName2.default`
        - xxx1 转译为 `_moduleName.xxx1`

    - `import * as xxx from './moduleName`

        1. 转译为 CommonJS 的 require，即 `var _moduleName = require
        2. 对引入的模块变量使用工具函数 `_interopRequireWildcard` 处理，即 `var xxx = _interopRequireWildcard(_moduleName);`，对于 ES 模块化输出直接返回，如果是非 ES 模块化输出的话，将原输出 _moduleName 赋值给新对象的 default 属性，并且将原输出 _moduleName 的自身属性拷贝给这个新对象
        3. 模块调用代码不变，还是使用 `xxx`

# 实际应用
ES 是未来的趋势，尽量使用 ES 模块化方案

1. 解决 ES export default 输出给 CommonJS require 带来的问题

    如果目标模块是自己可以修改的，可以考虑按 `export const xxx...` 和 `export default xxx` 混合的方式输出，这样 require 引入的模块还是可以正常使用，目前很多第三方模块都是按这种方式输出的。

    如果不能调整目标模块，则需要修改模块引入代码，在调用的时候改为 `require.default`，或者使用插件 [babel-plugin-add-module-exports](https://www.npmjs.com/package/babel-plugin-add-module-exports) 解决该问题。

2. 解决 ES import 使用解构方式引入 export default 返回的是 undefined 的问题

    - `export const xxx...` 的模块，使用 `import { xxx } from...` 引入；
    - `export default xxx` 的模块，使用 `import xxx from...` 引入
    - `export const xxx...` + `export default xxx` 的模块，可以使用 `import xxx { xxx1 } from...` 引入，目前很多第三方库都是这种方式输出的，例如 React；
    - `import * as xxx from...` 不要针对 `export default xxx` 使用；

3. ES import 引用 CommonJS 规范的模块，不用担心任何问题，因为 babel 的工具函数会在 import 引入模块的时候，对模块输出进行特殊处理（模拟 ES 模块输出的结构）。
