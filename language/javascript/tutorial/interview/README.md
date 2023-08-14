## this 指向

- 问题：下面代码的输出是什么？

    ```js
    const obj = {
      fn1: () => console.log(this),
      fn2: function() {console.log(this)}
    }

    obj.fn1();
    obj.fn2();

    const x = new obj.fn1();
    const y = new obj.fn2();
    ```

- 解答：

    ```
    1. window 或 undefined
    2. obj
    3. 报错
    4. 不执行，但是执行后会输出 fn2 构造的新实例
    ```

- 示例：https://codesandbox.io/s/mutable-butterfly-xg9hfm

## 原型链

https://codesandbox.io/s/prototype-rty44s


---

## ECMAScript

### 请简述 JavaScript 中 的 this

- 在调用函数时使用 new 关键字，函数内的 this 是一个全新的对象。
- 如果 apply、call 或 bind 方法用于调用、创建一个函数，函数内的 this 就是作为参数传入这些方法的对象。
- 当函数作为对象里的方法被调用时，函数内的 this 是调用该函数的对象。比如当 obj.method() 被调用时，函数内的 this 将绑定到 obj 对象。
- 如果调用函数不符合上述规则，那么 this 的值指向全局对象（global object）。浏览器环境下 this 的值指向 window 对象，但是在严格模式下('use strict')，this的值为 undefined。
- 如果符合上述多个规则，则较高的规则（1 号最高，4 号最低）将决定 this 的值。
- 如果该函数是 ES2015 中的箭头函数，将忽略上面的所有规则，this 被设置为它被创建时的上下文。

### 请解释原型继承（prototypal inheritance）的工作原理。

所有 JS 对象都有一个__proto__属性，指向它的原型对象。当试图访问一个对象的属性时，如果没有在该对象上找到，它还会搜寻该对象的原型，以及该对象的原型的原型，依次层层向上搜索，直到找到一个名字匹配的属性或到达原型链的末尾。

### 什么是事件循环？调用堆栈和任务队列之间有什么区别？

事件循环是一个单线程循环，用于监视调用堆栈并检查是否有工作即将在任务队列中完成。如果调用堆栈为空并且任务队列中有回调函数，则将回调函数出队并推送到调用堆栈中执行。

## DOM

### 请解释事件委托（event delegation）

事件委托是将事件监听器添加到父元素，而不是每个子元素单独设置事件监听器。当触发子元素时，事件会冒泡到父元素，监听器就会触发。这种技术的好处是：

- 内存占用减少，因为只需要一个父元素的事件处理程序，而不必为每个后代都添加事件处理程序。
- 无需从已删除的元素中解绑处理程序，也无需将处理程序绑定到新元素上。

### document 中的load事件和DOMContentLoaded事件之间的区别是什么？

当初始的 HTML 文档被完全加载和解析完成之后，DOMContentLoaded 事件被触发，而无需等待样式表、图像和子框架的完成加载。

## BOM

### Service Worker

- Service Worker 的生命周期是什么样的？
- 如何更新Service Worker？
- Service Worker 如何跨域请求资源？
- Service Worker 在哪些方面可以提高Web应用程序的性能？
- Service Worker 在哪些方面可能会带来安全问题？

## 函数式编程

### 什么事高阶函数？

高阶函数是将一个或多个函数作为参数的函数，它用于数据处理，也可能将函数作为返回结果。高阶函数是为了抽象一些重复执行的操作。一个典型的例子是 map，它将一个数组和一个函数作为参数。map 使用这个函数来转换数组中的每个元素，并返回一个包含转换后元素的新数组。JavaScript 中的其他常见示例是 forEach、filter 和 reduce。高阶函数不仅需要操作数组的时候会用到，还有许多函数返回新函数的用例。Function.prototype.bind 就是一个例子。

### 你能举出一个柯里化函数（curry function）的例子吗？它有哪些好处？

柯里化（currying）是一种模式，其中具有多个参数的函数被分解为多个函数，当被串联调用时，将一次一个地累积所有需要的参数。这种技术帮助编写函数式风格的代码，使代码更易读、紧凑。值得注意的是，对于需要被 curry 的函数，它需要从一个函数开始，然后分解成一系列函数，每个函数都需要一个参数。

```js
function curry(fn) {
  /* 待实现 */
}
function add(a, b) {}
const curriedAdd = curry(add);
const addFive = curriedAdd(5);
const result = [0, 1, 2, 3, 4, 5].map(addFive); // [5, 6, 7, 8, 9, 10]
// ---
function curry(fn) {
  if (fn.length === 0) {
    return fn;
  }

  function _curried(depth, args) {
    return function (newArgument) {
      if (depth - 1 === 0) {
        return fn(...args, newArgument);
      }
      return _curried(depth - 1, [...args, newArgument]);
    };
  }

  return _curried(fn.length, []);
}

function add(a, b) {
  return a + b;
}

var curriedAdd = curry(add);
var addFive = curriedAdd(5);

var result = [0, 1, 2, 3, 4, 5].map(addFive); // [5, 6, 7, 8, 9, 10]
```

## 参考文献

- [JavaScript 问题](https://www.frontendinterviewhandbook.com/zh/javascript-questions)


---

- 怎么理解 js 语言的单线程特性？

---

## 语法

### 基础数据类型

- undefined
- null
- Boolean
- Number
- String
- Object

    - [Object.observe API概述](https://www.cnblogs.com/rubylouvre/p/3427171.html)

- Symbol

    - [ECMAScript 6 入门 —— Symbol](http://es6.ruanyifeng.com/#docs/symbol)
    - [内置 Symbol 值详细概述_ES6, JavaScript 教程](https://juejin.im/entry/57bd14961532bc006583d805)

### 操作符

#### 关系运算符

- `==` / `!=`

    - 如果两个操作数是相同类型，则返回与 === 或 !== 操作相同的结果；
    - null/undefined == null/undefined 返回 true；
    - NaN 不与任何值相等；
    - 布尔值 == 任意非布尔值，先将布尔值转换为数值（false 转为 0，true 转为 1）；
    - 数值 == 字符串，先将字符串转为数值（Number(str)，Number('') 为 0）；
    - 数值 == 对象，对象转换为原始数据类型后再比较 —— 先调用 valueOf 转换，如果能转换为原始数据类型，则使用该值。否则再调用用 toString 将对象转换为原始数据类型；
    - 字符串 == 字符串，比较两个字符串是否相等 —— 同上；
    - 字符串 == 对象，对象转换为原始数据类型后再比较

- ...

#### 算数运算符

- [关于js浮点数计算精度不准确问题的解决办法](https://www.cnblogs.com/xinggood/p/6639022.html)

#### 解构 | 扩展 | 剩余参数

TODO

### 函数

- IFFE：立即执行函数

    - `(function foo(){ })()`
    - `(function foo(){ }())`

### 字符串

模板

- ES6 字符串模板
- Handlebars
- Underscore
- Lodash
- AngularJS
- JSX

### 严格模式

> 'use strict' 是用于对整个脚本或单个函数启用严格模式的语句。严格模式是可选择的一个限制 JavaScript 的变体一种方式 。

### 对象

#### Error

- TypeError
- RangeError
- ReferenceError

Reference

- [JavaScript Error对象及错误类型](https://itbilu.com/javascript/js/V1oOv4Vv-.html#error-type)
- [【译】10 种最常见的 Javascript 错误](http://elevenbeans.github.io/2018/02/05/top-10-javascript-errors/)

    1. Uncaught TypeError: Cannot read property
    2. TypeError: ‘undefined’ is not an object
    3. TypeError: null is not an object
    4. (unknown): Script error
    5. TypeError: Object doesn’t support property
    6. TypeError: ‘undefined’ is not a function
    7. Uncaught RangeError: Maximum call stack
    8. TypeError: Cannot read property ‘length’
    9. Uncaught TypeError: Cannot set property
    10. ReferenceError: event is not defined


## 作用域

### 变量提升

> 变量提升（hoisting）是用于解释代码中变量声明行为的术语。使用var关键字声明或初始化的变量，会将声明语句“提升”到当前作用域的顶部。 但是，只有声明才会触发提升，赋值语句（如果有的话）将保持原样。

### this

1. 在调用函数时使用new关键字，函数内的this是一个全新的对象。
2. 如果apply、call或bind方法用于调用、创建一个函数，函数内的 this 就是作为参数传入这些方法的对象。
3. 当函数作为对象里的方法被调用时，函数内的this是调用该函数的对象。比如当obj.method()被调用时，函数内的 this 将绑定到obj对象。
4. 如果调用函数不符合上述规则，那么this的值指向全局对象（global object）。浏览器环境下this的值指向window对象，但是在严格模式下('use strict')，this的值为undefined。
5. 如果符合上述多个规则，则较高的规则（1 号最高，4 号最低）将决定this的值。
6. 如果该函数是 ES2015 中的箭头函数，将忽略上面的所有规则，this被设置为它被创建时的上下文。

优先级：new, arrow > bind > apply, call > object > global

### 闭包

> 闭包是函数和声明该函数的词法环境的组合。词法作用域中使用的域，是变量在代码中声明的位置所决定的。闭包是即使被外部函数返回，依然可以访问到外部（封闭）函数作用域的函数。

- [破解前端面试（80% 应聘者不及格系列）：从 闭包说起](https://zhuanlan.zhihu.com/p/25855075)

### 匿名函数

- IIFE
- 回调函数

## 继承

### 原型继承工作原理

> 所有 JS 对象都有一个prototype属性，指向它的原型对象。当试图访问一个对象的属性时，如果没有在该对象上找到，它还会搜寻该对象的原型，以及该对象的原型的原型，依次层层向上搜索，直到找到一个名字匹配的属性或到达原型链的末尾。

## 模块

### ES Module

- 浏览器支持情况

    - [Chrome 63 正式支持动态导入 | Dynamic import()](https://segmentfault.com/a/1190000012106657)
    - [[阅 #27] Chrome 63 已经支持动态 import](https://zhuanlan.zhihu.com/p/31654322)
    - [为什么 ES Module 的浏览器支持没有意义](https://zhuanlan.zhihu.com/p/25046637)

## 其他

### 宿主对象 VS 原生对象

- > 原生对象：是由 ECMAScript 规范定义的 JavaScript 内置对象，比如String、Math、RegExp、Object、Function等等。
- > 宿主对象：是由运行时环境（浏览器或 Node）提供，比如window、XMLHTTPRequest等等。

### 功能检测 VS 功能推断 VS UA

- > 功能检测包括确定浏览器是否支持某段代码，以及是否运行不同的代码（取决于它是否执行），以便浏览器始终能够正常运行代码功能，而不会在某些浏览器中出现崩溃和错误。
- > 功能推断与功能检测一样，会对功能可用性进行检查，但是在判断通过后，还会使用其他功能，因为它假设其他功能也可用。
- > UA 是一个浏览器报告的字符串，它允许网络协议对等方（network protocol peers）识别请求用户代理的应用类型、操作系统、应用供应商和应用版本。它可以通过navigator.userAgent访问。 然而，这个字符串很难解析并且很可能存在欺骗性。

## HTML5

- 地址位置
- 历史记录
- 跨域消息传递
- Web Worker
- 文件系统
- 数据库
- Web Socket

## 架构

## 函数式编程

### 高阶函数

> 高阶函数是将一个或多个函数作为参数的函数，它用于数据处理，也可能将函数作为返回结果。

### 柯里化函数

> 柯里化（currying）是一种模式，其中具有多个参数的函数被分解为多个函数，当被串联调用时，将一次一个地累积所有需要的参数。这种技术帮助编写函数式风格的代码，使代码更易读、紧凑。值得注意的是，对于需要被 curry 的函数，它需要从一个函数开始，然后分解成一系列函数，每个函数都需要一个参数。

### 继承 VS 组合

- [Composition vs Inheritance](https://reactjs.org/docs/composition-vs-inheritance.html)
- [Difference between using a HOC vs. Component Wrapping](https://stackoverflow.com/questions/36960675/difference-between-using-a-hoc-vs-component-wrapping)
