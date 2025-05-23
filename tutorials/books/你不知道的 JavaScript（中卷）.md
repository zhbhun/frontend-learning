# 你不知道的 JavaScript（中卷）

## 第一部分 类型和语法

### 第一章 类型

- javascript 基本数据类型

### 第二章 值

- javascript 数值：语法、安全范围、整数检测、特殊数值

### 第三章 原生函数

- 常用的原生函数有：String()、Number()、Boolean()、Array()、Object()、Function()、RegExp()、Date()、Error()、Symbol()
Object 内部属性 [[class]]
- 基本类型值没有 .length 和 .toString() 这样的属性和方法，需要通过封装对象才能访问， 此时 JavaScript 会自动为基本类型值包装 （box或者 wrap） 一个封装对象
- 如果想要得到封装对象中的基本类型值，可以使用 valueOf() 函数，而在需要用到封装对象中的基本类型值的地方会发生隐式拆封。
- 原生函数可以作为构造函数使用，但要少用，尽量使用字面量
- Function.prototype 是一个空函数， RegExp.prototype 是一个“空”的正则表达式（无任何匹配） ， 而 Array.prototype 是一个空数组。 对未赋值的变量来说， 原型是很好的默认值。

### 第四章 强制类型转换

- 数据类型转换机制
- 显示数据类型转换
- 隐式数据类型转换
- 宽松相等和严格相等

### 第五章 语法

- 区分语句（statement）和表达式（expression）：语句相当于句子，表达式相当于短语，运算符则相当于标点符号和连接词。
- 语句都有一个结果值：statement completion value，undefined 也算。通过 eval 或 ES7 提案的“do 表达式”可以获取语句的结果值

    ```js
    var a, b;
    a = eval( "if (true) { b = 4 + 38; }" );
    a; //
    ```

    ```js
    var a, b;
    a = do {
      if (true) {
        b = 4 + 38;
      }
    };
    a;
    ```

    ps：do 似乎没有被浏览器支持

- 运算符优先级参考 MDN 的[“优先级列表”](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Operator_Precedence)
- 自动分号插入（D:\Foxmail\Foxmail.exe）是一个语法纠错机制，避免滥用
- JavaScript 错误分为两大类：早期错误（编译时错误，无法被捕获）和运行时错误（通过通过 `try..catch` 来捕获）。

    编译时错误

    ```js
    // 编译时错误导致 `catch` 后续的代码都无法正常运行
    // Uncaught SyntaxError: Unexpected token '+='
    try {
      += 1;
    } catch (error) {
      console.log(error); // 无法捕获
    }
    ```

    运行时错误

    ```js
    try {
      let reg = /+a/;
    } catch (error) {
      console.log(error); // SyntaxError: Invalid regular expression: /+a/: Nothing to repeat
    }
    ```

