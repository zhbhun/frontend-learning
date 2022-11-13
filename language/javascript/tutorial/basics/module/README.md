# 模块

- [一览js模块化：从CommonJS到ES6](一览js模块化：从CommonJS到ES6)

## 教程

### 循环依赖

ES Module 支持循环依赖，后引入的模块不能直接使用钱引入模块的导出值，而必须在异步回调函数中使用。

ps：Node CommonJS 遇到循环依赖时，后引入的模块会使用模块缓存初始化对象值，如果前引入的模块修改了初始化对象值，后引入的模块会无法正常使用。

```js
// a.js
import b, { b1 } from "./b.js";
export var a1 = "a1...";
export default "a...";
console.log("++ a", b, b1); // ++ a b... a1...
setTimeout(() => {
  console.log("-- a", b, b1); // -- a b... a1...
}, 0);

// b.js
import a, { a1 } from "./a.js";
export var b1 = "a1...";
export default "b...";
// console.log("++ b", a, a1); // Uncaught ReferenceError: Cannot access 'a' before initialization
setTimeout(() => {
  console.log("-- b", a, a1); // -- b a... a1...
}, 0);
```

### Import Map

用法

```html
<script type="importmap">
{
  "imports": {
    "loadash": "/libs/loadash/index.js",
    "jquery": "/libs/jquery/index.js",
    "three": "/libs/three.js/three.js",
    "three/examples/": "/libs/three.js/examples/"
  }
}
</script>
```

- 通过别名指定模块的地址， 适用于只有一个 js 文件的模块；
- 通过路径指定模块的目录，适用于多个js文件组成的模块；

参考文献

- [在浏览器中通过 importmap 使用 ES 模块](https://beginor.github.io/2021/08/16/using-es-modules-in-borwser-with-importmaps.html)

### 兼容性


| ES Modules Features                | Chrome             | Firefox            | Safari             |
| ---------------------------------- | ------------------ | ------------------ | ------------------ |
| modulepreload    | 66+                | :x:                | :x:                |
| Dynamic Import  | 63+                | 67+                | 11.1+              |
| import.meta.url  | ~76+               | ~67+               | ~12+ ❕<sup>1</sup> |
| Import Maps        | 89+                | :x:                | :x:                |
| JSON Modules      | 91+                | :x:                | :x:                |
| CSS Modules        | 95+                | :x:                | :x:                |
| import.meta.resolve    | :x:                | :x:                | :x:                |
| Module Workers  | ~68+               | :x:                | :x:                |
| Top-Level Await                    | 89+                | 89+                | 15+                |

- [es-module-shims](https://github.com/guybedford/es-module-shims)

---

---

- [Modular JavaScript](https://mjavascript.com/)
- [The state of JavaScript modules](https://medium.com/webpack/the-state-of-javascript-modules-4636d1774358)
- [JavaScript Modules: Welcome to My Emo Hellscape](https://medium.com/@trek/last-week-i-had-a-small-meltdown-on-twitter-about-npms-future-plans-around-front-end-packaging-b424dd8d367a)
- [Writing Modular JavaScript With AMD, CommonJS & ES Harmony](https://addyosmani.com/writing-modular-js/)
- [ECMAScript 6 modules: the final syntax](http://2ality.com/2014/09/es6-modules-final.html)
- [ECMAScript modules in browsers](https://jakearchibald.com/2017/es-modules-in-browsers/)
- [Using ECMAScript 6 today](http://2ality.com/2014/08/es6-today.html#using_ecmascript_6_today)
- [What do ES6 modules export?](http://2ality.com/2015/07/es6-module-exports.html)
- [Node.js, TC-39, and Modules](https://hackernoon.com/node-js-tc-39-and-modules-a1118aecf95e)
- http://jsmodules.io/cjs.html
- [ES6 Modules in Depth](https://ponyfoo.com/articles/es6-modules-in-depth)

---

| | CommonJS | AMD | ESM |
| --- | --- | --- | --- |
| 场景 | 服务端 | 客户端 | 服务端与客户端 |
| 语法 | 简洁 | 复杂 | 简洁 |
| 机制 | 动态，同步 | 动态，异步 | 静态，同步，异步，更好的支持循环依赖 |

---

# 静态 VS 动态
- 快速查找
- 变量检查
- 类型检查
- 支持宏命令

# 同步 VS 异步
TODO

# 循环依赖
- CommonJS：可以在引入其他模块前输出

    - 命名输出

        ```
        // --- a.js ---
        var b = require('b');
        exports.foo = function () { ... };
        // --- b.js ---
        var a = require('a'); // (1)
        // Can’t use a.foo in module body,
        // but it will be filled in later
        exports.bar = function () {
          a.foo(); // OK (2)
        };
        // --- main.js ---
        var a = require('a');
        ```

    - 默认输出

        ```
        // --- a.js ---
        var b = require('b');
        exports.exports = function () { ... };
        // --- b.js ---
        var a = require('a'); // (1)
        exports.bar = function () {
          a.foo(); // Fail (2)
        };
        // --- main.js ---
        var a = require('a');
        ```

- ESM

---

- [pikapkg/web](https://github.com/pikapkg/web)

---

1. 直接什么依赖
2. 命名空间
3. 模块模型
4. 依赖注入
5. CommonJS
6. AMD
7. UMD
8. ES Module

## 参考文献

- [【第905期】JavaScript 模块演化简史](https://mp.weixin.qq.com/s/3eiK4liZY_BvncNqyLTgnA)

