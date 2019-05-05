http://www.typescriptlang.org/docs/handbook/variable-declarations.html

# 作用域

- 全局作用域，global-scope
- 模块作用域，module-scope
- 函数作用域，function-scope
- 块作用域，lexical-scoping 或 block-scoping

# 声明方式

| Fetures / Types | var | let | const |
| --- | --- | --- | --- |
| Block-scoping | ✗ | ✓ | |
| Re-declarations | ✓ | ✗ | |
| Shadowing | ✗ | ✓ | |
| Block-scoped variable capturing | ✗ | ✓ | |

## let vs const
遵从 [最小权限原则](https://en.wikipedia.org/wiki/Principle_of_least_privilege)，如果一个变量声明后不会再修改，那么请使用 `const`。

## const vs immutable
- `const`：变量不能重新赋值，但可以修改变量内部属性
- `immutable`：对象不可变，每次修改后返回一个新的对象引用

## 解构赋值

- 数组

    - 声明
    - 赋值
    - 参数
    - 剩余
    - 默认值

- 对象

    - 声明
    - 赋值
    - 参数
    - 剩余
    - 重命名
    - 默认值

[解构赋值](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment)

## 扩展语句
- 数组
- 对象

    只扩展自身（非原型），可迭代的属性

[扩展语句](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Spread_operator)
