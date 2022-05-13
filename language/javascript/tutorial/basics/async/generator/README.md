# 生成器

## 基础

### 创建生成器函数

要点

- 带星号的函数：`function* gen() {}`
- 使用 yield 暂停任务：`yield <expression>`
- 函数返回值智一个遍历器，使用遍历器的 next 方法来控制生成器函数内部的执行。


```js
function* gen(x) {
  const y = yield x + 2;
  return y;
}
const g = gen(1);
g.next() // { value: 3, done: false }
g.next() // { value: undefined, done: true } 
```

### 数据交换

- 生成器函数 =》 外部调用：遍历器的 value 属性就是生成器函数当前执行步骤的结果（当前 yield 后面的表达式计算结果）
- 外部调用 =》 生成器函数：遍历器的 next 方法支持传值，该值作为上一个 yield 的执行结果(如果上一步返回的是一个 Promise，那么我们可以等 Promise 返回，然后传入 next，这就是运行器的工作原理）

```js
function* gen(x) {
  const y = yield x + 2;
  return y;
}
const g = gen(1);
g.next() // { value: 3, done: false } // 执行到 x + 2，value 是该计算结果值
g.next(1) // { value: 1, done: true } // next 传参会作为上一步 yield 的执行结果，所以 y 等于 1
```

### 错误处理

```
function* gen(x){
  try {
    var y = yield x + 2;
  } catch (e){ 
    console.log(e);
  }
  return y;
}
var g = gen(1);
g.next();
g.throw（'出错了'）;
// 出错了
```

ps：上面代码的最后一行，Generator 函数体外，使用指针对象的 throw 方法抛出的错误，可以被函数体内的 try ... catch 代码块捕获。

## 运行器

### Thunk 函数

编译器的"传名调用"实现，往往是将参数放到一个临时函数之中，再将这个临时函数传入函数体，这个临时函数就叫做 Thunk。在 JavaScript 语言中，Thunk 函数替换的不是表达式，而是多参数函数，将其替换成单参数的版本，且只接受回调函数作为参数。

Thunk 函数

```js
function thunkify(fn){
  return function(){
    var args = new Array(arguments.length);
    var ctx = this;

    for(var i = 0; i < args.length; ++i) {
      args[i] = arguments[i];
    }

    return function(done){
      var called;

      args.push(function(){
        if (called) return;
        called = true;
        done.apply(null, arguments);
      });

      try {
        fn.apply(ctx, args);
      } catch (err) {
        done(err);
      }
    }
  }
};
```

运行器

```js
function run(fn) {
  var gen = fn();

  function next(err, data) {
    var result = gen.next(data);
    if (result.done) return;
    result.value(next);
  }

  next();
}
```

示例

```js
var fs = require('fs');
var thunkify = require('thunkify');
var readFile = thunkify(fs.readFile);

var gen = function* (){
  var r1 = yield readFile('/etc/fstab');
  console.log(r1.toString());
  var r2 = yield readFile('/etc/shells');
  console.log(r2.toString());
};

run(gen);
```

参考文献

- [Thunk函数的含义与用法](https://www.ruanyifeng.com/blog/2015/04/generator.html)

### co 函数

- [co函数库的含义与用法](https://www.ruanyifeng.com/blog/2015/05/co.html)

### async

async 函数就是 Generator 函数的语法糖。

- 内置执行器：Generator 函数的执行必须靠执行器，而 async 函数自带执行器；
- 更好的语义：async 和 await，比起星号和 yield，语义更清楚了；
- 更广的适用性：co 函数库约定，yield 命令后面只能是 Thunk 函数或 Promise 对象，而 async 函数的 await 命令后面，可以跟 Promise 对象和原始类型的值（数值、字符串和布尔值，但这时等同于同步操作）；

- [async函数的含义与用法](https://www.ruanyifeng.com/blog/2015/05/async.html)

## 参考文献

- https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Generator
- [Generator 函数的含义与用法](https://www.ruanyifeng.com/blog/2015/04/generator.html)
- https://github.com/facebook/regenerator
