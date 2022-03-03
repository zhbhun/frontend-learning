# 使用场景
Flow 本身会做类型推断来检查代码，可以不使用注解就能发现许多存在的类型错误。

但是，Flow 不会对模块输出做类型推断，所以模块输出必须带有注解，否则 Flow 在检查时会提示该模块输出缺少注解。例如：模块输出函数的参数和返回值都要带有注解。

**思考：为什么 Flow 不对模块边界做类型推断？**

1. 模块边界注解可以提升 Flow 代码分析速度
2. 模块边界注解可以当做模块的接口文档

示例：`./schne`

- `./scene/type-inference.js`：测试类型推断

    Flow 可以通过类型推断，发现类似空值引用，未定义函数调用，错误类型操作（如非数值算数运算）等错误。

- `./scene/size.js` 和 `./scene/useSize.js`：测试模块输出注解

    - 默认执行执行示例，观察模块输出注解的作用
    - 去掉 `./scene/size.js` 的注解，可以发现 Flow 提示模块输出缺少注解

备注：尝试调整注释为 `// @flow weak` 来开启弱模式，观察 Flow 类型推断和模块边界类型检查情况 —— **弱模式不做推断类型，并且不再强制要求模块边界编写类型注解（自行当做 `any` 处理？）**。

# 注解类型
- 原始类型

    - `boolean`
    - `number`
    - `string`
    - `null`
    - `void`

- `any`
- `mixed`
- `Array`
- `Object`
- `Function`
- `Class`
- `type`
- `GenericObject` / `GenericClass`

参考文献

- [QUICK REFERENCE](https://flowtype.org/docs/quick-reference.html)
- [Built-in Types](https://flowtype.org/docs/builtins.html)
- [Type Aliases](https://flowtype.org/docs/type-aliases.html)
- [Functions](https://flowtype.org/docs/functions.html)
- [Classes](https://flowtype.org/docs/classes.html)
- [Objects](https://flowtype.org/docs/objects.html)


## 模块输入输出

# 注解语法
- 注释语法
- 变量声明

参考文献

- [SYNTAX](https://flowtype.org/docs/syntax.html)

## 函数声明

```javascript
// 参数注解 + 返回值注解
function numVowels(word: string): number {
    const vowels = new Set("aeiou");
    let count = 0;
    for (let char of word)
    if (vowels.has(char))
        count++;
    return count;
}

// 泛型注解
function reversed<T>(array: T[]): T[] {
    let ret = [];
    let i = array.length;
    while (i--)
    ret.push(array[i]);
    return ret;
}

// Rest 参数注解（当做数组类型）
function sum(...xs: number[]): number {
    return xs.reduce((a,b) => a + b);
}

// 箭头函数
`const flip = <A,B>([a,b]: [A,B]): [B,A] => [b,a];`
```

## 类声明

```javascript
// 属性类型注解 + 方法类型注解
class Point {
    x: number;
    y: number;

    constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    }

    move(x: number, y: number) {
    this.x += x;
    this.y += y;
    }

    copy(): Point {
    return new Point(this.x, this.y);
    }
}

// 泛型注解
class Box<T> {
    _value: T;

    constructor(value: T) {
    this._value = value;
    }

    get(): T {
    return this._value;
    }
}
```
