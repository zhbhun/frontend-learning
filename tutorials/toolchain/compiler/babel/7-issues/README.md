## babel5 升级 babel6

babel6 存在较大的改动，具体情况如下所示：

1. babel 拆分为多个包

    - babel-cli：命令行使用 `npm install babel-cli`；
    - babel-core：Node API，`npm install babel-core`；
    - babel-register：require hook，`npm install babel-register`；
    - babel-polyfill：提供 ES 新标准的 API，`npm install babel-polyfill`；
    - 原先的 babel 包已经废弃，需要卸载 `npm uninstall babel`；

2. preset 机制

    - babel6 默认不再支持 es2015 以及 react，需要安装配置对应的 preset —— `npm install babel-preset-es2015 babel-preset-react --save-dev`；
    - stage 也要以 preset 的形式安装配置 —— `npm install babel-preset-stage-2 --save-dev`；
    - .babelrc 的 preset 配置方式

        ```json
        {
          "presets": ["es2015", "react"]
        }
        ```

3. `export default` 编译调整，生成代码里不再执行 `module.exports = exports['default'];`，即不再将模块输出赋给 `module.exports`

    - CommonJS `require` 的模块引入需要改成这样 `require('./xxx').default`；
    - 不能再通过解构的形式来引入 export defaut 的模块；

参考文献

- [babel6 升级总结](https://segmentfault.com/a/1190000004301150)
- [Default export value in Babel 6.x](http://schempy.com/2016/04/08/default_export_value_babel_6x/)
- [Misunderstanding ES6 Modules, Upgrading Babel, Tears, and a Solution](https://medium.com/@kentcdodds/misunderstanding-es6-modules-upgrading-babel-tears-and-a-solution-ad2d5ab93ce0#.m0cz4izeb)
- [The Complete Guide to ES6 with Babel 6](http://jamesknelson.com/the-complete-guide-to-es6-with-babel-6/)
- [Webpack babel 6 ES6 decorators](http://stackoverflow.com/questions/33801311/webpack-babel-6-es6-decorators)
- [升级 babel 遇到的几个问题](https://chemzqm.me/babel-problems)

## babel6 module

问题

1. 为什么 import 使用解构方式引入 export default 返回的是 undefined？
2. 为什么 require 引入 export default 模块返回值变得不一样了？
3. 为什么不能使用 export-from 语句了？

分析：参考示例 [babel6-module]('./babel6-module')

总结：

ES 是未来的趋势，尽量使用 ES 模块化方案

1. 解决 ES export default 输出给 CommonJS require 带来的问题

    如果目标模块是自己可以修改的，那么考虑按 `export const xxx...` 和 `export default xxx` 混合的方式输出，这样 require 引入的模块还是可以正常使用，目前很多第三方模块都是按这种方式输出的。

    如果不能调整目标模块，则需要修改模块引入代码，在调用的时候改为 `require.default`，或者使用插件 [babel-plugin-add-module-exports](https://www.npmjs.com/package/babel-plugin-add-module-exports) 解决该问题。

2. 解决 ES import 使用解构方式引入 export default 返回的是 undefined 的问题

    - `export const xxx...` 的模块，使用 `import { xxx } from...` 引入；
    - `export default xxx` 的模块，使用 `import xxx from...` 引入
    - `export const xxx...` + `export default xxx` 的模块，可以使用 `import xxx { xxx1 } from...` 引入，目前很多第三方库都是这种方式输出的，例如 React；
    - `import * as xxx from...` 不要针对 `export default xxx` 使用；

3. ES import 引用 CommonJS 规范的模块，不用担心任何问题，因为 babel 的工具函数会在 import 引入模块的时候，对模块输出进行特殊处理（模拟 ES 模块输出的结构）。

##  babel-polyfill vs babel-runtime

babel-polyfill 使用场景

Babel 默认只转换新的 JavaScript 语法，而不转换新的 API。例如，Iterator、Generator、Set、Maps、Proxy、Reflect、Symbol、Promise 等全局对象，以及一些定义在全局对象上的方法（比如 Object.assign）都不会转译。如果想使用这些新的对象和方法，必须使用 babel-polyfill，为当前环境提供一个垫片。

babel-runtime 使用场景

Babel 转译后的代码要实现源代码同样的功能需要借助一些帮助函数，例如，`{ [name]: 'JavaScript' }` 转译后的代码如下所示：

```javascript
'use strict';
function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
var obj = _defineProperty({}, 'name', 'JavaScript');
```

类似上面的帮助函数 _defineProperty 可能会重复出现在一些模块里，导致编译后的代码体积变大。Babel 为了解决这个问题，提供了单独的包 `babel-runtime` 供编译模块复用工具函数。

启用插件 `babel-plugin-transform-runtime` 后，Babel 就会使用 `babel-runtime` 下的工具函数，转译代码如下：

```javascript
'use strict';
// 之前的 _defineProperty 函数已经作为公共模块 `babel-runtime/helpers/defineProperty` 使用
var _defineProperty2 = require('babel-runtime/helpers/defineProperty');
var _defineProperty3 = _interopRequireDefault(_defineProperty2);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var obj = (0, _defineProperty3.default)({}, 'name', 'JavaScript');
```

除此之外，babel 还为源代码的非实例方法（`Object.assign`，实例方法是类似这样的 `"foobar".includes("foo")`）和 babel-runtime/helps 下的工具函数自动引用了 polyfill。这样可以避免污染全局命名空间，非常适合于 JavaScript 库和工具包的实现。例如 `const obj = {}, Object.assign(obj, { age: 30 });` 转译后的代码如下所示：

```javascript
'use strict';
// 使用了 core-js 提供的 assign
var _assign = require('babel-runtime/core-js/object/assign');
var _assign2 = _interopRequireDefault(_assign);
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
var obj = {};
(0, _assign2.default)(obj, {
  age: 30
});
```

思考：babel-runtime 为什么适合 JavaScript 库和工具包的实现？

1. 避免 babel 编译的工具函数在每个模块里重复出现，减小库和工具包的体积；
2. 在没有使用 babel-runtime 之前，库和工具包一般不会直接引入 polyfill。否则像 Promise 这样的全局对象会污染全局命名空间，这就要求库的使用者自己提供 polyfill。这些 polyfill 一般在库和工具的使用说明中会提到，比如很多库都会有要求提供 es5 的 polyfill。在使用 babel-runtime 后，库和工具只要在 package.json 中增加依赖 babel-runtime，交给 babel-runtime 去引入 polyfill 就行了；

总结：

1. 具体项目还是需要使用 babel-polyfill，只使用 babel-runtime 的话，实例方法不能正常工作（例如 `"foobar".includes("foo")`）；
2. JavaScript 库和工具可以使用 babel-runtime，在实际项目中使用这些库和工具，需要提供 polyfill；

疑问：像 antd@2.x 这样的库使用了 babel-runtime，在实际项目中使用 antd@2.x，我们需要引入 babel-polyfill。但全部 polyfill 打包压缩下来也有 80kb 左右，其中很多 polyfill 是没有用到的，如何减少体积呢？手工一个个引入使用到的 polyfill，似乎维护成本太高！

参考文献

- http://babeljs.io/docs/plugins/transform-runtime/
- [Is there any practical difference between using babel-runtime and the babel-polyfill when *not* developing a library? (e.g. web application)](http://stackoverflow.com/questions/31781756/is-there-any-practical-difference-between-using-babel-runtime-and-the-babel-poly)
- [babel的polyfill和runtime的区别](https://segmentfault.com/q/1010000005596587)
- [babel-runtime?](https://github.com/ant-design/ant-design/issues/2814)
- http://www.ruanyifeng.com/blog/2016/01/babel.html#comment-367093
- [Babel 6 babel-polyfill， babel-plugin-external-helpers-2 babel-plugin-transform-runtime如何选择](https://cnodejs.org/topic/56a836e7073124894b190b60)

## 对比 TypeScript

- babel

    优点

    - 支持还在提案中的非标准的语法
    - 支持按需引入 polyfill
    - 支持自定义插件扩展

    缺点

    - 只能做单文件编译，不支持多文件的类型检查
    - 不支持部分 ts 语法，例如：不支持 const enum、支持 namespace 跨文件合并等

- ts

    优点：支持多文件类型检查

    缺点：不支持按需引入 polyfill，不支持非标准的语法

参考文献

- [为什么说用 babel 编译 typescript 是更好的选择](https://zhuanlan.zhihu.com/p/376867546)
- [[译] TypeScript 和 Babel：美丽的结合](https://zhuanlan.zhihu.com/p/59614089)
