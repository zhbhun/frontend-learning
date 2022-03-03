http://www.typescriptlang.org/docs/handbook/basic-types.html

| type/value | Boolean | Number | String | Enum | Any | Object | Void | Null | Undefined | Never |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Boolean | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Number | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| String | ✗ | ✗ | ✓ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Enum | ✗ | ✓ | ✗ | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Any | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Object | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ |
| Void | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ |
| Null | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Undefined | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Never | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |

备注：

- 默认情况下，`null` 和 `undefined` 是所有其他类型的子类型，这意味着可以将 null 和 undefined 赋值任意类型的变量。在开启 `--strictNullChecks` 时，`null` 和 `undefined` 只能赋值给 `void` 和它们各自的类型。在这种模式下，如果要想将一个可能为字符串，空值或未定义的值赋给字符串变量，可以给该变量声明类型 `string | null | undefined`。
- `never` 类型是所有类型的子类型，可以赋值给任意类型的变量。但是 `nerver` 没有任意子类型，也就不能给 `never` 类型的变量赋任何值（除了 `nerver`）。
