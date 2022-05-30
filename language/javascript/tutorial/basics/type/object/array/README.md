# 数组

## 基础

### 数组增删

- [`Array.prototype.fill()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/fill)

### 数组遍历

- [`Array.prototype.every()`](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Array/every)
- [Processing Arrays non-destructively: for-of vs. .reduce() vs. .flatMap()](https://2ality.com/2022/05/processing-arrays-non-destructively.html)

### 数组属性设置

`array[var] = 1`

var 先转换为数值，如果数值是个大于等于 0 的正整数，那么会作为数组下标使用，否则作为对象属性使用。


## 进阶

### 循环删除数组中元素的正确方法

- 倒序循环删除
- 正序循环删除，删除操作后将索引值减 1

参考

- [循环删除数组中元素的正确方法](https://blog.csdn.net/XuM222222/article/details/82656144)
