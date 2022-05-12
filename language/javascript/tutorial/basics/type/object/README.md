# 对象

## 基础

### 字面量

。。。

### 内置对象

- Number
- Boolean
- String
- Object
- Function
- Array
- Date
- RegExp
- Error

### 属性描述符

属性描述符

- value：当前值
- writable：是否可写

    ps：不可写的属性，在严格模式下回抛出异常 TypeError

- enumerable：是否可迭代
- configurable：是否可配置

    ps：不管是否处于严格模式，修改不可配置的属性描述符都会抛出 TypeError，而且不可配置的属性不允许 delete 删除。

- get
- set

相关方法

- `Object.getOwnPropertyDescriptor(obj, key)`
- `Object.defineProperty(obj, key, { value, writable, configurable, enumerable })`

### 内置操作

- `[[Get]]()`：对象属性访问时的内置操作。

    在语言规范中， myObject.a 在 myObject 上实际上是实现了 [[Get]] 操作（有点像函数调用：[[Get]]() ）。对象默认的内置 [[Get]] 操作首先在对象中查找是否有名称相同的属性， 如果找到就会返回这个属性的值。然而，如果没有找到名称相同的属性，按照 [[Get]] 算法的定义会执行另外一种非常重要的行为。

    ps：详情参考 class 的“属性设置和屏蔽”

- `[[Put]]()`：对象属性设置时的内置操作。

    1. 检查是否存在属性描述符；
    2. 检查属性描述符的 writable 是否 true；
    3. 如果都不是，将该值设置为属性的值。

### 属性的存在性

- `in`
- `for..in`
- `Object.getOwnPropertyNames()`
- `Object.keys()`

### 对象遍历

- `for..of`
- `Symbol.iterator`

## 进阶

### 对象拷贝

- 浅拷贝

    - 解构：所有可枚举的自有属性
    - Object.assign：所有可枚举的自有属性

- 深拷贝

    - `JSON.parse(JSON.stringify())`：所有可枚举的属性的自有属性

### 扩展、封闭和冻结

不可添加 =》 不可添加、删除和配置 =》 不可添加、删除、配置和写

#### 不可扩展

让一个对象变的不可扩展，也就是永远不能再添加新的属性。

- [`Object.preventExtensions()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/preventExtensions)
- [`Object.isExtensible()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible)

ps：不可扩展的对象可以删除和配置现有属性。

#### 封闭

封闭一个对象，阻止添加新属性并将所有现有属性标记为不可配置。当前属性的值只要原来是可写的就可以改变。

- [`Object.seal()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/seal)
- [`Object.isSealed()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed)

ps：

- 封闭的对象也是不可扩展的对象，且不可以删除和配置现有属性
- 不可扩展的空对象也是封闭对象（isSealed 返回 true）

#### 冻结

一个被冻结的对象再也不能被修，不能向这个对象添加新的属性，不能删除已有属性，不能修改该对象已有属性的可枚举性、可配置性、可写性，以及不能修改已有属性的值。

- [Object.freeze()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
- [Object.isFrozen()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen)

ps：

- 冻结的对象也是不可扩展的封闭对象，且不可以改写属性值
- 封闭的空对象也是冻结对象（isFrozen 返回 true）

### 反射

- [Reflect](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect)
- [Object.keys()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)
- [Object.entries()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)
- [Object.defineProperty()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
- [Object.defineProperties()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties)
- [Object.getOwnPropertyDescriptor()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor)
- [Object.getOwnPropertyDescriptors()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptors)
- [Object.getOwnPropertyNames()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyNames)
- [Object.getOwnPropertySymbols()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertySymbols)
- [Object.getPrototypeOf()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/GetPrototypeOf)
- [Object.prototype.isPrototypeOf()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isPrototypeOf)
- [Object.setPrototypeOf()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/setPrototypeOf)

参考文献

- [JS的Reflect学习和应用](https://zhuanlan.zhihu.com/p/92700557)
- [ES6设计反射Reflect的意义是什么？(除了把key in obj、delete这些方式函数化)?](https://www.zhihu.com/question/276403215)

### 代理

参见 [proxy](./proxy/README.md)

### 深拷贝

- [如何写出一个惊艳面试官的深拷贝?](https://segmentfault.com/a/1190000020255831)
- https://segmentfault.com/a/1190000039310119
- https://zhuanlan.zhihu.com/p/41699218
- https://gist.github.com/Ariex/6e5b68bdb3f5e96275d3069d7dbb5579

## 实践

### has/in vs getOwnPropertyNames() vs keys()

TODO: ...

### 检测全局变量污染

- [Track down the JavaScript code responsible for polluting the global scope](https://mmazzarolo.com/blog/2022-02-16-track-down-the-javascript-code-responsible-for-polluting-the-global-scope/)

## TODO

- [12 Essential Object Manipulation Methods for JavaScript Devs in 2022](https://javascript.plainenglish.io/12-essential-object-manipulation-methods-for-javascript-devs-in-2022-f8e66e1b0e9)
