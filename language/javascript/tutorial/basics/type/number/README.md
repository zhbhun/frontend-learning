# 数字

## 进制转换

- 字面量：[浅析 ES6 的八进制与二进制整数字面量](https://www.jb51.net/article/91599.htm)

    以下都是值等于 `10` 的不同进制字面量

    - `10`：十进制
    - `0b1010` / `0B1010`：二进制
    - `012` / `0o12` / `0O12`：八进制
    - `0xa` / `0Xa`：十六禁止

- 十进制转其他进制：[Number.prototype.toString()](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Number/toString)

    - `(10).toString(2)`：`"1010"`
    - `(10).toString(8)`：`"12"`
    - `(10).toString(16)`：`"a"`
    - `(10).toString(36)`：`"a"`
    - `(-10).toString(2)`：`"-1010"`

        如果对象是负数，则会保留负号。即使 radix 是 2 时也是如此：返回的字符串包含一个负号（-）前缀和正数的二进制表示，不是数值的二进制补码。

    - `(10).toString(0)` / `(10).toString(37)`：抛出一个 `RangeError`

        `Uncaught RangeError: toString() radix argument must be between 2 and 36`

- 其他进制转十进制：[parseInt](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/parseInt)

    - `parseInt('10')`：`10`
    - `parseInt('1010', 2)`：`10`
    - `parseInt('12', 8)`：`10`
    - `parseInt('10', 10)`：`10`
    - `parseInt('a', 16)`：`10`
    - `parseInt('z', 36)`：`35`
    - `parseInt('-1010', 2)`：`-10`
    - `parseInt(1010, 2)`：`10`

        如果参数不是一个字符串，则将其转换为字符串，字符串开头的空白符将会被忽略。

    - `parseInt('a', 1)` / `parseInt('a', 10)` / `parseInt('a', 37)`：`NaN`

        如果被解析参数的第一个字符无法被转化成数值类型，则返回 `NaN`。

    - `parseInt("6.022e23", 10)`：`6` / `parseInt(6.022e2, 10)`：`602`

        如果 parseInt 遇到了不属于 radix 参数所指定的基数中的字符那么该字符和其后的字符都将被忽略。接着返回已经解析的整数部分。parseInt 将截取整数部分。开头和结尾的空白符允许存在，会被忽略。

    - `parseInt('0xa')`：`10` / `parseInt('0o12', 10)`：`0` / `parseInt('0b1010')`：`0`

        在基数为 undefined，或者基数为 0 或者没有指定的情况下。如果字符串 string 以"0x"或者"0X"开头, 则基数是16 (16进制)。如果字符串 string 以"0"开头, 基数是8（八进制）或者10（十进制），那么具体是哪个基数由实现环境决定。如果字符串 string 以其它任何值开头，则基数是10 (十进制)。

## 精度问题

[JavaScript 中精度问题以及解决方案](https://www.runoob.com/w3cnote/js-precision-problem-and-solution.html)
