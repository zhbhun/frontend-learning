- [JS 中的 void 到底有啥用？](http://cmichel.io/javascript-void-keyword/)

# 数据类型转换
## 布尔类型转换
TODO

## 数值类型转换

- `undefined`：NaN
- `null`：0
- `true` / `false`： 1 / 0
- 字符串

    - 数字字符串

        - 数字字符串开头和尾部可以有空格字符或换行符
        - 数字字符串开头可以有任意个 0
        - 数字字符串开头可以带符号（+ / -）
        - 数字字符串只包含空格字符或换行符时转换为 0
        - `'Infinity' / `'-Infinity'` 被转换为 `Infinity` / `-Infinity`
        - 数字字符串的数字部分可以是浮点数，二进制数，八进制数，十六进制数

    - 非数字字符串：NaN

- 对象

    先调用对象方法 `valueOf`，如果返回值是原始数据类型，则按上面的规则对返回值进行转换。否则，调用对象方法 `toString`，再对返回值做数值类型转换。`

    默认的对象，即 `{}` 或 `new Object()`，`valueOf` 返回值是对自身的引用，`toString` 返回值是 `"[object Object]"`。所以，默认对象转换结果为 NaN。

    - 数组：数组的 `valueOf` 返回值是对自身的引用

        - `[]`：由于 `[]` 的 `toString` 返回 `""`，所以转换结果是 `0`
        - `[1]`：由于 `[1]` 的 `toString` 返回 `"1"`，所以转换结果是 `1`
        - `[1, 2]`：由于 `[1, 2]` 的 `toString` 返回 `"1,2"`，所以转换结果是 `NaN`

    - 函数：函数的 `valueOf` 返回值是对自身的引用，`toString` 返回值是 `"function () {}"`，所以转换结果是 `NaN`
    - 日期：日期的 `valueOf` 返回值同 `Date.prototype.getTime()`，所以转换结果是相应的毫秒数
    - 正则表达式：正则表达式的 `valueOf` 返回值是对自身的引用，`toString` 返回值是带有 `/` 作为开头和结尾的正则表达式字符串，所以转换结果是 NaN

## 字符串类型转换
TODO

# 规范

- [Type Conversion](http://www.ecma-international.org/ecma-262/7.0/#sec-type-conversion)
- [ToNumber](http://www.ecma-international.org/ecma-262/7.0/#sec-tonumber)
- [ToBoolean](http://www.ecma-international.org/ecma-262/7.0/#sec-toboolean)
- [ToPrimitive](http://www.ecma-international.org/ecma-262/7.0/#sec-toprimitive)
