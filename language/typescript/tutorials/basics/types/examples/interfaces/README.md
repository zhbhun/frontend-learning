- Object Properties

    `interface` / `literals`

    - Optional Properties: `?`
    - Readonly properties

        - `readonly`
        - `ReadonlyArray<T>`

    - Excess Property Checks

        **Object literals** get special treatment and undergo excess property checking when **assigning them to other variables, or passing them as arguments**.

    总结

    - 传递属性：

        - 对象字面量不可以包含没有声明的属性，否则提示属性未知
        - 变量或对象字面量必须包含非可选属性，否则提示缺失属性

    - 访问属性：不可以访问没有声明的属性
    - 修改属性：

        - 不可以修改未声明的属性
        - 不可以覆盖只读属性

- Function Types
- Indexable Types
- Class Types
- Extending Interfaces
- Hybrid Types
- Interfaces Extending Classes
