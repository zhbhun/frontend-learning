# 对象

## 用法

### 字面量

。。。

### 配置

#### 不可扩展

让一个对象变的不可扩展，也就是永远不能再添加新的属性。

- [`Object.preventExtensions()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/preventExtensions)
- [`Object.isExtensible()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isExtensible)

ps：不可扩展的对象可以删除和配置现有属性。


### 封闭

封闭一个对象，阻止添加新属性并将所有现有属性标记为不可配置。当前属性的值只要原来是可写的就可以改变。

- [`Object.seal()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/seal)
- [`Object.isSealed()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isSealed)

ps：

- 封闭的对象也是不可扩展的对象，且不可以删除和配置现有属性
- 不可扩展的空对象也是封闭对象（isSealed 返回 true）

### 冻结

一个被冻结的对象再也不能被修，不能向这个对象添加新的属性，不能删除已有属性，不能修改该对象已有属性的可枚举性、可配置性、可写性，以及不能修改已有属性的值。

- [Object.freeze()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/freeze)
- [Object.isFrozen()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/isFrozen)

ps：

- 冻结的对象也是不可扩展的封闭对象，且不可以改写属性值
- 封闭的空对象也是冻结对象（isFrozen 返回 true）