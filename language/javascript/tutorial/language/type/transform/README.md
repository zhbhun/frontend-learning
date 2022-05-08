
- [JavaScript 隐式类型转换，一篇就够了！](https://chinese.freecodecamp.org/news/javascript-implicit-type-conversion/)

---

## 减、乘、除

先将非 Number 类型转换为 Number 类型。

- undefined：undefined 转换为数字是 NaN
- null：首先把 null 转换为数字 0
- NaN：计算结果都是 NaN
- true：1
- false：0
- 字符串：

    - 数字字符串开头和尾部可以有空格字符或换行符
    - 数字字符串开头可以有任意个 0
    - 数字字符串开头可以带符号（+ / -）
    - 数字字符串只包含空格字符或换行符时转换为 0
    - `'Infinity' / `'-Infinity'` 被转换为 `Infinity` / `-Infinity`
    - 数字字符串的数字部分可以是浮点数，二进制数，八进制数，十六进制数
    - 其他情况均为 NaN

- 对象：先调用对象方法 `valueOf`，如果返回值是原始数据类型，则按上面的规则对返回值进行转换。否则，调用对象方法 `toString`，再对返回值做数值类型转换。
- 数组：同对象，需要注意的是单元素数组 toString 后是氮元素的值，所以能否转换还得看该元素的值
- 日期：日期的 `valueOf` 返回值同 `Date.prototype.getTime()`，所以转换结果是相应的毫秒数

## 加法

不同于其他运算符，加法还可以用于字符串拼接，需要根据运算符左右两侧的值类型做区分。

- 当一侧为 String 类型，被识别为字符串拼接，并会优先将另一侧转换为字符串类型。
- 当一侧为 Number 类型，另一侧为非字符串的原始类型，则将原始类型转换为 Number 类型，转换规则同上面的“减、乘、除”
- 当一侧为 Number 类型，另一侧为引用类型，将引用类型和 Number 类型转换成字符串后拼接。

## 比较运算符

- undefiend 都是 false
- null 会转换为 0
- boolean 会转为 number
- NaN 都是 false
- number 和非 undefined 类型比较都会将其隐式转为 number 后再做比较
- string 和 string，从左到右一次判断
- 引用类型会先转为 number 后再判断

## 相等运算符

- null == undefined 比较结果是true，除此之外，null、undefined 和其他任何结果的比较值都为 false；
- NaN 和其他任何类型比较永远返回false（包括和他自己）;
- Boolean 和其他任何类型比较，Boolean 首先被转换为 Number 类型；
- String 和 Number 比较，先将 String 转换为 Number 类型；
- 原始类型和引用类型做比较时，引用类型会依照 ToPrimitive 规则转换为原始类型。

## 条件判断

- 单个变量：只有 null、undefined、、NaN、0、''、false 这几个是 false，其他的情况都是 true，比如 {} , []。
- ...

