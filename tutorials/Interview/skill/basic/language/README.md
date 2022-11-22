## HTML

- html 和 body 的区别
- viewport
- web component
- 响应式媒体资源

## CSS

- 选择器优先级
- CSS inherit、initial、unset、reserve
- CSS 布局方式
- CSS 动画属性
- CSS 命名
- CSS Module
- CSS IN JS
- CSS Normalize VS CSS Reset

## JavaScript

- 闭包
- this 指向
- ES Module
- Event Loop 

## Typescript

- type vs interface

    相同点：

    1. 都可以描述 '对象' 或者 '函数' 
    2. 都允许拓展(extends)

    不同点：

    1. type 可以声明基本类型，联合类型，元组
    2. type 可以使用 typeof 获取实例的类型进行赋值
    3. 多个相同的 interface 声明可以自动合并

    使用 interface 描述‘数据结构’，使用 type 描述‘类型关系’。

- any vs unkown vs void vs never
- 泛型
- 简单聊聊你对 TypeScript 类型兼容性的理解？

    ts 类型兼容：

    当一个类型 Y 可以赋值给另一个类型 X 时， 我们就可以说类型 X 兼容类型 Y。也就是说两者在结构上是一致的，而不一定非得通过 extends 的方式继承而来

    接口的兼容性：`X = Y`，只要目标类型 X 中声明的属性变量在源类型 Y 中都存在就是兼容的（ Y 中的类型可以比 X 中的多，但是不能少）

    函数的兼容性：`X = Y`，Y 的每个参数必须能在 X 里找到对应类型的参数，参数的名字相同与否无所谓，只看它们的类型

- 协变、逆变、双变和抗变的理解？

    协变：`X = Y`，Y 类型可以赋值给 X 类型的情况就叫做协变，也可以说是 X 类型兼容 Y 类型

    ```ts
    interface X { name: string; age: number; } 
    interface Y { name: string; age: number; hobbies: string[] }
    let x: X = { name: 'xiaoming', age: 16 }
    let y: Y = { name: 'xiaohong', age: 18, hobbies: ['eat'] }
    x = y
    ```

    逆变：printY = printX 函数 X 类型可以赋值给函数 Y 类型，因为函数 Y 在调用的时候参数是按照 Y 类型进行约束的，但是用到的是函数 X 的 X 的属性和方法，ts 检查结果是类型安全的。这种特性就叫做逆变，函数的参数有逆变的性质。

    ```ts
    let printY: (y: Y) => void
    printY = (y) => { console.log(y.hobbies) }
    let printX: (x: X) => void
    printX = (x) => { console.log(x.name) }
    printY = printX
    ```

    双变（双向协变）：X = Y；Y = X父类型可以赋值给子类型，子类型可以赋值给父类型，既逆变又协变，叫做“双向协变”（ts2.x 之前支持这种赋值，之后 ts 加了一个编译选项 strictFunctionTypes，设置为 true 就只支持函数参数的逆变，设置为 false 则支持双向协变）

    抗变（不变）：非父子类型之间不会发生型变，只要类型不一样就会报错

