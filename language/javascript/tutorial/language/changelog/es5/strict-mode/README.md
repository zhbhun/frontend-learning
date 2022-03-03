ECMAScript 5 的严格模式是 JavaScript 中的一种限制性更强的变种方式。

# 为什么

- 消除 JavaScript 语法的一些不合理、不严谨之处，减少一些怪异行为；
- 消除代码运行的一些不安全之处，保证代码运行的安全；
- 提高编译器效率，增加运行速度；
- 为未来新版本的 Javascript 做好铺垫；

# 用法
- script：作用于整个脚本

    ```javascript
    <script>
        'use strict';
    </script>
    ```

- function：作用于整个函数

    ```javascript
    function strict() {
      'use strict';
    }
    ```

误区：函数内开启严格模式，不会影响调用函数内的代码执行模式，例如下面的函数 `a` 在严格模式下的函数 `c` 内调用，虽然函数 `b` 存在重名参数，但也能够正常运行。


```javascript
function a() {
  // 重名参数
  function b(arg, arg) {
  }
  b();
}
function c() {
  'use stricnt';
  a();
}
c();
```

# 区别

- 消除怪异行为

    - eval 不会在它的外层作用域引入变量
    - 函数的参数不能有同名属性，否则报错
    - 变量必须声明后再使用
    - arguments 不会自动反映函数参数的变化 —— [arguments的参数映射问题](https://www.web-tinker.com/article/20234.html)



- 提升安全性

    - 不能使用 with 语句
    - 不能对只读属性赋值，否则报错
    - 不能使用前缀 0 表示八进制数，否则报错
    - 不能删除不可删除的属性，否则报错 —— TypeError
    - 不能删除变量 delete prop，会报错，只能删除属性 delete global[prop] —— SyntaxError
    - eval 和 arguments 不能被重新赋值 —— SyntaxError
    - 不能使用 arguments.callee

        - [为什么被从 ES5 严格模式中移除掉了 ?](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/arguments/callee#为什么被从_ES5_严格模式中移除掉了)
        - [Why was the arguments.callee.caller property deprecated in JavaScript?](http://stackoverflow.com/questions/103598/why-was-the-arguments-callee-caller-property-deprecated-in-javascript/235760#235760)

    - 不能使用 arguments.caller

        - [Bug 7224 - Remove support for "caller" property](https://bugzilla.mozilla.org/show_bug.cgi?id=7224)
        - [caller](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/arguments/caller)
        - [Function.caller](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Function/caller)

    - 禁止 this 指向全局对象
    - 不能使用 fn.caller 和 fn.arguments 获取函数调用的堆栈

- 其他

    - 增加了保留字（比如protected、static和interface）

# 兼容性

IE6，7，8，9 均不支持严格模式

# 总结
使用了严格模式，一般错误代码会编译失败，提示语法错误，部分代码可能在运行时跑出类型错误

- 不要使用 eval，with
- ...

# 参考
- [严格模式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Strict_mode)
- [向严格模式过渡](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Strict_mode/Transitioning_to_strict_mode)
