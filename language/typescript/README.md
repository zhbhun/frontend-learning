# [TypeScript](http://www.typescriptlang.org)

## 类型

- 基本类型

    - any：顶层类型
    - known：顶层类型
    - never：底层类型，类似于集合的空集
    - void
    - number
    - bigint
    - boolean
    - string
    - symbol

        - `symbol`
        - `unique symbol`：值类型（类似字面量）

            - 只能使用 const 声明常量（由于每个 symbol 都是唯一的，所以它无法再次被赋值）
            - 类属性只能使用 readonly static（不能作为成员属性）

    - understand
    - null
    - object
    
        - 类型定义

            - 字面量
            - type
            - interface

        - 对象属性

            - 可选属性：?
            - 只读属性：readonly、`as const`
            - 索引类型：`{ [property: number | string | symbol]: string }` 

                数值或普通属性的索引值类型必须能够兼容字符索引类型属性的值类型

        - 结构类型规则
        
            只要对象 B 满足 对象 A 的结构特征，TypeScript 就认为对象 B 兼容对象 A 的类型，这称为“结构类型”原则（structural typing）。

        - 严格字面量检查
            
            如果对象使用字面量表示，会触发 TypeScript 的严格字面量检查（strict object literal checking）。如果字面量的结构跟类型定义的不一样（比如多出了未定义的属性），就会报错。

        - 最小可选属性规则/弱类型检测
        
            如果某个类型的所有属性都是可选的，那么该类型的对象(非字面量)必须至少存在一个可选属性，不能所有可选属性都不存在。

        - 空对象：`{}`

            - 空对象没有自定义属性，所以对自定义属性赋值就会报错。
            - 空对象作为类型，其实是Object类型的简写形式，各种类型的值（除了null和undefined）都可以赋值给空对象类型，跟Object类型的行为是一样的。
        
        - 强制空对象类型：`{ [key: string]: never; }`

- 包装类型

    - Boolean
    - Number
    - BigInt
    - String
    - Symbol

- 自定义类型

    - type
    - interface
    - class
    - enum
    - 值类型
    - 函数类型

        - 函数定义
        
            - `Function`
            - 箭头函数：`(a: number, b: string) => number`
            - 对象写法：`{ (a: number, b: string) => number }`
            - interface `interface fn { (a: number, b: string) => number }`

        - 参数定义

            - 可选参数
            - 参数默认值

        - 函数重载
        - 构造函数：
        
            - 箭头函数： `new () => Animal`

                ```ts
                class Animal {}
                function create(c: new () => Animal): Animal {
                    return new c();
                }
                create(Animal)
                ```

            - 对象写法：`{ new (): Animal; }`
            - 混合写法：`{ new (): Animal; (): string; }`

- 集合类型

    - 数组

        - `Array<>`
        - `T[]`
        - `ReadonlyArray<T>` / `readonly Array<T>`
        - `Readonly<T[]>` / `Readonly<Array<T>>` / `readonly T[]`

    - 元组

        - `[number, string]`
        - `[string, ...number[]]`：不限数量
        - `[...any[]]`
        - `([number, string])[0]`：`number`
        - `([number, string])[number]`：`number | string`
        - `readonly [number, string]`
        - `Readonly<[number, string]>`

- 工具类型

    - 断言类型：`as`

        - 只读：`as const`

    - 联合类型：`|`
    - 交叉类型：`&`
    - 值类型计算：`typeof``
    - 泛型

- 类型兼容

    - 协变：
    
        - 返回值类型：`A ≼ B` =》`(T → A) ≼ (T → B)`
        - 不可变数组：`A ≼ B` =》`ReadonlyArray<A> ≼ ReadonlyArray<B>`

            ps：如果是可变数组，那么既不是斜变也不是逆变。

    - 逆变：

        - 参数类型：`A ≼ B` => `(B → T) ≼ (A → T) `
        - 参数数量：`(a: number) => void` ≼ `(a: number, b: number) => void`

## 配置

- 输出

    - noEmit
    - noEmitOnError
    - outDir
    - outFile

- 检查

    - exactOptionalPropertyTypes
    - noImplicitAny：禁用隐式的 any 类型(声明不赋值的变量是例外)
    - strictNullChecks
    - suppressExcessPropertyErrors：关闭多余属性检查

- 兼容性

    - target

## 工具

- playground
- tsc
- ts-node
