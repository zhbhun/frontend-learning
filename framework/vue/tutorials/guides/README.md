# 教程

## [Vue 实例](https://cn.vuejs.org/v2/guide/instance.html)

每个 Vue 应用都是通过用 Vue 函数创建一个新的 Vue 实例开始的：

```js
var vm = new Vue({
  // 选项
});
```

### 数据

当一个 Vue 实例被创建时，它将 data 对象中的所有的属性加入到 Vue 的响应式系统中。当这些属性的值发生改变时，视图将会产生“响应”，即匹配更新为新的值。

```js
// 我们的数据对象
var data = { a: 1 }

// 该对象被加入到一个 Vue 实例中
var vm = new Vue({
  data: data
})

// 获得这个实例上的属性
// 返回源数据中对应的字段
vm.a == data.a // => true

// 设置属性也会影响到原始数据
vm.a = 2
data.a // => 2

// ……反之亦然
data.a = 3
vm.a // => 3
```

### 属性

- `$data`

    ```js
    var data = { a: 1 }
    var vm = new Vue({
      el: '#example',
      data: data
    })

    vm.$data === data // => true
    ```

- `$el`

    ```
    var data = { a: 1 }
    var vm = new Vue({
      el: '#example',
      data: data
    })

    vm.$el === document.getElementById('example') // => true
    ```

### 方法

- `$watch`

    ```js
    var data = { a: 1 }
    var vm = new Vue({
      el: '#example',
      data: data
    })

    vm.$watch('a', function (newValue, oldValue) {
    // 这个回调将在 `vm.a` 改变后调用
    })
    ```

### [计算属性](https://cn.vuejs.org/v2/guide/computed.html#%E8%AE%A1%E7%AE%97%E5%B1%9E%E6%80%A7)

```js
var vm = new Vue({
  el: '#example',
  data: {
    message: 'Hello'
  },
  computed: {
    // 计算属性的 getter
    reversedMessage: function () {
      // `this` 指向 vm 实例
      return this.message.split('').reverse().join('')
    }
  }
})
```

### [侦听器](https://cn.vuejs.org/v2/guide/computed.html#%E4%BE%A6%E5%90%AC%E5%99%A8)

TODO

### 生命周期

![lifecycle.png](./lifecycle.png)

## [模板语法](https://cn.vuejs.org/v2/guide/syntax.html)

- 插值

    - 文本：`<span>Message: {{ msg }}</span>`
    - 原生 HTML：`<span v-html="rawHtml"></span>`
    - JavaScript 表达式：`{{ number + 1 }}`

- 指令：指令是带有 `v-` 前缀的特殊特性，该特殊特性的值预期是单个 JavaScript 表达式。指令的职责是，当表达式的值改变时，将其产生的连带影响，响应式地作用于 DOM。

    - 参数：`<a v-bind:href="url">...</a>`
    - 动态参数：`<a v-bind:[attributeName]="url"> ... </a>`
    - 修饰符：`<form v-on:submit.prevent="onSubmit">...</form>`

- 缩写

    - `v-bind:`：`:`
    - `v-on:`：`@`

### 绑定属性

- [Class 绑定](https://cn.vuejs.org/v2/guide/class-and-style.html#%E7%BB%91%E5%AE%9A-HTML-Class)
- [内联样式绑定](https://cn.vuejs.org/v2/guide/class-and-style.html#%E7%BB%91%E5%AE%9A%E5%86%85%E8%81%94%E6%A0%B7%E5%BC%8F)

### 条件渲染

- [`v-if`](https://cn.vuejs.org/v2/guide/conditional.html#v-if)
- [`v-show`](https://cn.vuejs.org/v2/guide/conditional.html#v-show)

### [列表渲染](https://cn.vuejs.org/v2/guide/list.html)

TODO

## [事件处理](https://cn.vuejs.org/v2/guide/events.html)

TODO

## [表单](https://cn.vuejs.org/v2/guide/forms.html)

TODO

## [组件化](https://cn.vuejs.org/v2/guide/components.html)

TODO
