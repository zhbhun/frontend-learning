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

### 条件渲染

- 基础用法

    ```vue
    <h1 v-if="awesome">Vue is awesome!</h1>
    ```

    ```vue
    <h1 v-if="awesome">Vue is awesome!</h1>
    <h1 v-else-if="greate">Vue is great!</h1>
    <h1 v-else>Oh no 😢</h1>
    ```

- 应用在多个元素上

    ```vue
    <template v-if="ok">
      <h1>Title</h1>
      <p>Paragraph 1</p>
      <p>Paragraph 2</p>
    </template>
    ```

- `v-if` vs `v-show`

    - `v-if` 懒加载，`v-show` 始终加载
    - `v-if` 切换成本比 `v-show` 高


- [`v-if`](https://cn.vuejs.org/v2/guide/conditional.html#v-if)
- [`v-show`](https://cn.vuejs.org/v2/guide/conditional.html#v-show)

### [列表渲染](https://cn.vuejs.org/v2/guide/list.html)

用法

- basic：`v-for="item in items" :key="item.xxx"`

    ```vue
    <ul id="example-1">
      <li v-for="item in items" :key="item.message">
        {{ item.message }}
      </li>
    </ul>
    ```

- index：`v-form="(item, index) in items"`

    ```vue
    <ul id="example-2">
      <li v-for="(item, index) in items">
        {{ index }} - {{ item.message }}
      </li>
    </ul>
    ```

- parent: 在 v-for 块中，我们可以访问所有父作用域的 property。
- object：v-for 支持遍历一个对象的 property

    ```vue
    <ul id="v-for-object" class="demo">
      <li v-for="value in object">
        {{ value }}
      </li>
    </ul>
    ```

    ```vue
    <div v-for="(value, name) in object">
      {{ name }}: {{ value }}
    </div>
    ```

    ```vue
    <div v-for="(value, name, index) in object">
      {{ index }}. {{ name }}: {{ value }}
    </div>
    ```

维护状态

vue 默认使用“就地更新”策略，如果数据项的顺序被改变，Vue 将不会移动 DOM 元素来匹配数据项的顺序，而是就地更新每个元素，并且确保它们在每个索引位置正确渲染。这个默认的模式是高效的，但是只适用于不依赖子组件状态或临时 DOM 状态 (例如：表单输入值) 的列表渲染输出。为了给 Vue 一个提示，以便它能跟踪每个节点的身份，从而重用和重新排序现有元素，你需要为每项提供一个唯一 key。

更新策略

- 变更方法：push、pop。。。
- 替换数组

过滤数据

1. 使用计算属性
2. 嵌套循环使用方法

### [插槽](https://cn.vuejs.org/v2/guide/components-slots.html)

- 插槽内容
- 后备内容
- 具名插槽：用法、动态插槽名、具名插槽的缩写语法
- 编译作用域
- 作用域插槽：用法、缩写、解构
- 插槽 prop 允许我们将插槽转换为可复用的模板

## 绑定样式

- [Class 绑定](https://cn.vuejs.org/v2/guide/class-and-style.html#%E7%BB%91%E5%AE%9A-HTML-Class)

    - 对象语法

        ```vue
        <div
          class="static"
          v-bind:class="{ active: isActive, 'text-danger': hasError }"
        ></div>
        ```

    - 数组语法

        ```vue
        <div v-bind:class="[activeClass, errorClass]"></div>
        ```

    - 属性/计算属性

        ```vue
        <div v-bind:class="classObject"></div>

        data: {
          classObject: {
            active: true,
            'text-danger': false
          }
        }
        ```

        ```vue
        <div v-bind:class="classObject"></div>
        data: {
          isActive: true,
          error: null
        },
        computed: {
          classObject: function () {
            return {
              active: this.isActive && !this.error,
              'text-danger': this.error && this.error.type === 'fatal'
            }
          }
        }
        ```
    
    - 自定义组件
    
        当在一个自定义组件上使用 class property 时，这些 class 将被添加到该组件的根元素上面。这个元素上已经存在的 class 不会被覆盖。

- [内联样式绑定](https://cn.vuejs.org/v2/guide/class-and-style.html#%E7%BB%91%E5%AE%9A%E5%86%85%E8%81%94%E6%A0%B7%E5%BC%8F)

    CSS property 名可以用驼峰式 (camelCase) 或短横线分隔 (kebab-case，记得用引号括起来) 来命名。

    - 对象语法

        ```vue
        <div v-bind:style="{ color: activeColor, fontSize: fontSize + 'px' }"></div>
        ```

        样式对象

        ```
        <div v-bind:style="styleObject"></div>
        data: {
          styleObject: {
            color: 'red',
            fontSize: '13px'
          }
        }
        ```
    
    - 数组语法

        ```vue
        <div v-bind:style="[baseStyles, overridingStyles]"></div>
        ```
    
    - 自动添加前缀
    - 多重值

## [事件处理](https://cn.vuejs.org/v2/guide/events.html)

> 可以用 `v-on` 指令监听 DOM 事件，并在触发时运行一些 JavaScript 代码。

- 监听事件
- 事件处理方法
- 内链处理器中的方法
- 事件修饰符
- 按键修饰符
- 系统修饰键

参考文献

- [自定义事件](https://cn.vuejs.org/v2/guide/components-custom-events.html#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6%E7%9A%84-v-model)

## [表单](https://cn.vuejs.org/v2/guide/forms.html)

> `v-model` 指令在表单 `<input>`、`<textarea>` 及 `<select>` 元素上创建双向数据绑定。

- 文本

    ```vue
    <input v-model="message" placeholder="edit me">
    <p>Message is: {{ message }}</p>
    ```

- 多行文本
- 复选款：单个复选款值为布尔值，多个复选值为数组

    ```vue
    <input type="checkbox" id="jack" value="Jack" v-model="checkedNames">
    <label for="jack">Jack</label>
    <input type="checkbox" id="john" value="John" v-model="checkedNames">
    <label for="john">John</label>
    <input type="checkbox" id="mike" value="Mike" v-model="checkedNames">
    <label for="mike">Mike</label>
    <br>
    <span>Checked names: {{ checkedNames }}</span>
    ```

- 单选框
- 选择框

### 值绑定

对于单选按钮，复选框及选择框的选项，v-model 绑定的值通常是静态字符串 (对于复选框也可以是布尔值)。但是有时我们可能想把值绑定到 Vue 实例的一个动态 property 上，这时可以用 v-bind 实现，并且这个 property 的值可以不是字符串。

### 修饰符

- .lazy：在 change 事件之后进行同步
- .number：自动将用户的输入值转为数值类型
- .trim：自动过滤用户输入的首尾空白字符

### [自定义组件](https://cn.vuejs.org/v2/guide/components-custom-events.html#%E8%87%AA%E5%AE%9A%E4%B9%89%E7%BB%84%E4%BB%B6%E7%9A%84-v-model)

```vue
Vue.component('base-checkbox', {
  model: {
    prop: 'checked',
    event: 'change'
  },
  props: {
    checked: Boolean
  },
  template: `
    <input
        type="checkbox"
        v-bind:checked="checked"
        v-on:change="$emit('change', $event.target.checked)"
    >
    `
})
```

## [组件化](https://cn.vuejs.org/v2/guide/components.html)

> 组件是可复用的 Vue 实例，所以它们与 new Vue 接收相同的选项，例如 data、computed、watch、methods 以及生命周期钩子等。仅有的例外是像 el 这样根实例特有的选项。

1. 组件复用时，data 必须是一个函数；

    ```vue
    ```
    // 定义一个名为 button-counter 的新组件
    Vue.component('button-counter', {
      data: function () {
        return {
          count: 0
        }
      },
      template: '<button v-on:click="count++">You clicked me {{ count }} ti<!--  -->mes.</button>'
    })
    ```

2. 通过 Prop 向子组件传递数据；

    ```vue
    Vue.component('blog-post', {
      props: ['title'],
      template: '<h3>{{ title }}</h3>'
    })
    ```

3. template 必须是单个根元素 
4. 监听子组件事件
5. 使用插槽分发内容
6. 动态组件

    ```vue
    <component v-bind:is="currentTabComponent"></component>
    ```

### 组件注册

- 组件名：kebab-case / PascalCase
- 注册范围：全局 VS 局部

### Prop

- 属性名大小写问题
- 类型检测
- 静态传递或动态 Prop：数值、布尔值、数组、对象（如何传入所有属性）
- 单向数据流：受控组件 VS 非受控组件
- 非 Prop 的 Attribute

    组件可以接受任意的 attribute，而非 Props 的 attribute 会被添加到这个组件的根元素上。如果你不希望组件的根元素继承 attribute，你可以在组件的选项中设置 inheritAttrs: false。

### 动态组件

- 动态组件应用场景
- [在动态组件上使用 keep-alive](https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%9C%A8%E5%8A%A8%E6%80%81%E7%BB%84%E4%BB%B6%E4%B8%8A%E4%BD%BF%E7%94%A8-keep-alive)

### [异步组件](https://cn.vuejs.org/v2/guide/components-dynamic-async.html#%E5%BC%82%E6%AD%A5%E7%BB%84%E4%BB%B6)

TODO

### [访问元素 & 组件](https://cn.vuejs.org/v2/guide/components-edge-cases.html)

- 根实例
- 父组件实例
- 子组件实例
- 依赖注入

### [程序化的事件侦听器](https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E7%A8%8B%E5%BA%8F%E5%8C%96%E7%9A%84%E4%BA%8B%E4%BB%B6%E4%BE%A6%E5%90%AC%E5%99%A8)

- `$on(eventName, eventHandler)`
- `$once(eventName, eventHandler)`
- `$off(eventName, eventHandler)`

### [循环引用](https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E7%A8%8B%E5%BA%8F%E5%8C%96%E7%9A%84%E4%BA%8B%E4%BB%B6%E4%BE%A6%E5%90%AC%E5%99%A8)

TODO

### [模板定义的替代品](https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E6%A8%A1%E6%9D%BF%E5%AE%9A%E4%B9%89%E7%9A%84%E6%9B%BF%E4%BB%A3%E5%93%81)

- 字符产
- 内联模板
- X-Template

### [控制更新](https://cn.vuejs.org/v2/guide/components-edge-cases.html#%E6%A8%A1%E6%9D%BF%E5%AE%9A%E4%B9%89%E7%9A%84%E6%9B%BF%E4%BB%A3%E5%93%81)

- 强制更新
- `v-onece`

### [过渡动画](https://cn.vuejs.org/v2/guide/transitions.html)

- 进入/离开 & 列表过渡
- 状态过渡
 
### 复用 & 组合

- [混入](https://cn.vuejs.org/v2/guide/mixins.html)
- [自定义指令](https://cn.vuejs.org/v2/guide/custom-directive.html)
- [渲染函数 & JSX](https://cn.vuejs.org/v2/guide/render-function.html)
- [插件](https://cn.vuejs.org/v2/guide/plugins.html)
- [过滤器](https://cn.vuejs.org/v2/guide/filters.html)


### 单文件组件

存在问题

- 全局定义容易命名冲突
- 字符串模板没有语法高亮
- 不支持 CSS
- 没有编译构建

单文件组件：文件扩展名为 .vue 的 single-file components (单文件组件) 为以上所有问题提供了解决方法，并且还可以使用 webpack 或 Browserify 等构建工具。

- 模板支持语法高亮，且 HTML 支持不同的模板语法
- CSS 支持预处理器，且有组件作用域

**关注点分离""

> 一个重要的事情值得注意，关注点分离不等于文件类型分离。在现代 UI 开发中，我们已经发现相比于把代码库分离成三个大的层次并将其相互交织起来，把它们划分为松散耦合的组件再将其组合起来更合理一些。在一个组件里，其模板、逻辑和样式是内部耦合的，并且把他们搭配在一起实际上使得组件更加内聚且更可维护。
