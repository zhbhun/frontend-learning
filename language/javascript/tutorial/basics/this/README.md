# this

## 是什么？

当一个函数被调用时，会创建一个活动记录（有时候也称为执行上下文）。这个记录会包含函数在哪里被调用（调用栈）、函数的调用方法 、传入的参数等信息。this 就是记录的 其中一个属性，会在函数执行的过程中用到。

## this 指向

**绑定模式**

- 默认绑定

    - `fn()`：this 默认为全局对象，严格模式下为 undefined

- 隐式绑定

    - `obj.fn()`：this 指向 obj

- 显示绑定

    - `fn.bind(context)`：绑定函数调用时的 this 指向 context
    - `fn.call(context, ...args)`：函数执行时的 this 指向 context
    - `fn.apply(context, args)`：函数执行时的 this 指向 context
    - `Array.prototype.forEach(callback, context)`：第三方库的许多函数，以及 JavaScript 语言和宿主环境中许多新的内置函数，都提供了一 个可选的参数，通常被称为“上下文”（context），其作用和 bind(..) 一样，确保你的回调 函数使用指定的 this 。

    ps：`fn.call(null)` 或 `fn.call(undefined)` 会默认 null 和 undefined，实际按默认绑定规则。

- new 绑定：参考 [new 运算符](../class/README.md#new%20运算符)
- 箭头函数：this 指向声明箭头函数所在上下文的 this

**绑定优先级**

箭头函数 > new 绑定 > bind > apply / calll > 隐式绑定 > 默认绑定

**硬绑定 VS 软绑定**

- 硬绑定：同 bind

    ```js
    if (!Function.prototype.bind) {
      Function.prototype.bind = function (oThis) {
        if (typeof this !== 'function') {
          throw new TypeError(
            'Function.prototype.bind - what is trying ' +
              'to be bound is not callable'
          );
        }

        var aArgs = Array.prototype.slice.call(arguments, 1),
          fToBind = this,
          fNOP = function () {},
          fBound = function () {
            return fToBind.apply(
              this instanceof fNOP && oThis ? this : oThis,
              aArgs.concat(Array.prototype.slice.call(arguments))
            );
          };
        fNOP.prototype = this.prototype;
        fBound.prototype = new fNOP();

        return fBound;
      };
    }
    ```

- 软绑定：在有隐式绑定或或试用了 apply 和 call 时，优先使用这些绑定，没有的时候才使用 bind 的 this。

    ```js
    if (!Function.prototype.softBind) {
      Function.prototype.softBind = function (obj) {
        var fn = this;
        // 捕获所有 curried 参数
        var curried = [].slice.call(arguments, 1);
        var bound = function () {
          return fn.apply(
            !this || this === (window || global) ? obj : this,
            curried.concat.apply(curried, arguments)
          );
        };
        bound.prototype = Object.create(fn.prototype); // 保留原型链
        return bound;
      };
    }
    ```
