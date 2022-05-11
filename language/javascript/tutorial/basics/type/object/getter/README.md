
# getter

## 用法

- 基础

    ```js
    const obj = {
      log: ['example','test'],
      get latest() {
        if (this.log.length === 0) return undefined;
        return this.log[this.log.length - 1];
      }
    }
    console.log(obj.latest); // "test"
    ``` 

- 删除 getter 属性

    ```js
    delete obj.latest
    ```

- 追加 getter 属性

    ```js
    const o = {a: 0};
    
    Object.defineProperty(o, 'b', { get: function() { return this.a + 1; } });
    
    console.log(o.b) // Runs the getter, which yields a + 1 (which is 1)
    ```

- 使用计算属性

    ```js
    const expr = 'foo';
    
    const obj = {
      get [expr]() { return 'bar'; }
    };
    
    console.log(obj.foo); // "bar"
    ```

- class 静态 getter 属性

    ```
    class MyConstants {
      static get foo() {
        return 'foo';
      }
    }
    
    console.log(MyConstants.foo); // 'foo'
    MyConstants.foo = 'bar';
    console.log(MyConstants.foo); // 'foo', a static getter's value cannot be changed
    ```

## get vs defineProperty

- Object.defineProperty() 定义对象自身的属性
- class get 属性会定义在原型上

参见实例 [get-vs-defineProperty](./examples/getter/get-vs-defineProperty.js)

## 懒加载应用

getter 可以延迟一些属性的计算初始化，直到属性值被访问。并且在首次访问后可以删除 getter，将计算后的属性值赋给对象属性，从而避免重复计算。对于满足以下条件的场景，可以使用该方案：

- 属性的计算成本较高（占用较多的内存或 CPU）
- 属性值不需要立刻使用，或者只在部分场景下需要使用
- 属性值会被多次使用，且不需要重复计算

```js
get notifier() {
  delete this.notifier;
  return this.notifier = document.getElementById('bookmarked-notification-anchor');
},
```

参见示例 [lazy-getters.js](./examples/getter/lazy-getters.js)

ps：这里可以作为一个知识考点


## 参考文献

- [getter](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/get1)
