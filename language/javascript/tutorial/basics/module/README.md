# 模块

- [一览js模块化：从CommonJS到ES6](一览js模块化：从CommonJS到ES6)

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

