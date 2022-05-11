# 数据类型

## 基础

### 原始数据类型 VS 引用数据类型

| 特性 | 原始数据类型 | 引用数据类型 |
| --- | --- | --- |
| 数据类型 | `undefined`、`null`、`number`、`boolean`、`string`、`symbol`、`bigint` | Object、Array、Function、Date 等 |
| 访问 | 按值 | 按引用 |
| 存储大小 | 大小固定 | 大小不固定 |
| 存储结构 | 栈 | 堆 |

## 进阶

### 数据类型装箱和拆箱

除了 undefined 和 null 外，每个原始数据类型都有一个对应的包装类，这些类的主要目的是为基元值提供属性(主要是方法)。

- Boolean
- Number
- BigInt
- String
- Symbol

相互转换

- 装箱：原始数据类型 =》 包装类实例

    - `Object()`：通过函数调用 Object 可以将原始数据类型转为包装类实例
    - `new Wrapper()`：创建对应包装类实例

    ps：Symbol 不是构造函数，无法使用 new，但可以使用 Object(new Symbol()) 来创建包装类实例。

- 拆箱：包装类实例 =》 原始数据类型

    - `Wrapper()`：将任意值转为原始数据类型
    - `new Wrapper().valuesOf()`：

隐式装箱：每当读取一个基本类型时，后台会自动创建一个对应的包装类型对象，从而可以调用一些方法来操作数据（这也是为什么基础类型可以调用一些方法），而自动创建的包装类型只存于执行那一行的瞬间，执行完后会立即被销毁，所以一般在基础类型是无法添加属性和方法。

```js
let a = 'test'
let b = a.subString(2) // 会自动创建包装类型
// 以上代码后台的执行步骤
let a = 'test'
var _c = new String('test') // 创建String类型实例
let b =  _c.subString(2)    // 在实例上调用对应的方法
_c = null                   // 销毁实例
```





参考

- [What are wrapper objects for primitive values?](https://2ality.com/2022/02/wrapper-objects.html)
- [Difference between String() and new String() in Javascript](https://stackoverflow.com/questions/50082312/difference-between-string-and-new-string-in-javascript)
- [Is there difference between creating a wrapped BigInt or Symbol with the "new" keyword in JavaScript?](https://stackoverflow.com/questions/62155111/is-there-difference-between-creating-a-wrapped-bigint-or-symbol-with-the-new-k)
- [why can't you call "new BigInt('1234')"](https://github.com/tc39/proposal-bigint/issues/161)
- [How do primitive values get their properties?](https://2ality.com/2022/03/properties-of-primitives.html)
- [javascript数据类型及装箱拆箱介绍](https://segmentfault.com/a/1190000022396080)

## 常见问题

### 如何在JavaScript中处理 `null` 和 `undefined` ？

- [如何在JavaScript中处理null和undefined？](https://mp.weixin.qq.com/s/BCb5jAy0k0qJH2n5hWWPpw)
