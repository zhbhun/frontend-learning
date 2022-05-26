# 响应式系统

## 工作原理

### 背景：响应式数据和副作用函数

- 副作用函数：会产生副作用的函数，例如：修改了全局变量
- 响应式数据：修改了响应式数据的值后，副作用函数会自动重新执行

```js
// 响应式数据
const obj = { text: 'hello world' }

// 副作用函数
function effect() {
  document.body.innerText = obj.text
}

// 修改 obj.text 的值，同时希望副作用函数会重新执行
obj.text = 'hello vue'
```

### 方案：拦截对象属性的读取和设置操作

通过代理对象 Proxy 拦截对象属性的读取和设置操作。

```js
// 用一个全局变量存储被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect(fn) {
  activeEffect = fn
  fn()
}

function reactive(data) {
  return new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
      // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
      track(target, key)
      // 返回属性值
      return target[key]
    },
    // 拦截设置操作
    set(target, key, newVal) {
      // 设置属性值
      target[key] = newVal
      // 把副作用函数从桶里取出来并执行
      trigger(target, key)
    },
  })
}
// 存储副作用函数的桶
const bucket = new WeakMap()
// 在 get 拦截函数内调用 tack 函数追踪变化
function track(target, key) {
  // 没有 activeEffect，直接 return
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
}
// 在 set 拦截函数内调用 trigger 函数触发变化
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  effects && effects.forEach((fn) => fn())
}

// 示例
const obj = reactive({ text: 'hello world' })
effect(() => {
  console.log(obj.text)
})
obj.text = 'hello vue'
```

总结：

- 设置全局变量 activeEffect 存储被注册的副作用函数；
- 副作用函数需要与被操作对象的目标字段建立明确的联系；

  - WeakMap 由 target --> Map 构成；
  - Map 由 key --> Set 构成；
  - Set 有副作用函数构成；

### 解决问题 1：分支切换

问题：如下所示在副作用函数里有有一个三元表达式，根据字段 data.ok 值的不同会执行不同的代码分支。当字段 data.obj 的值发生变化时，代码执行的分支会跟着变化，副作用依赖对象目标字段也会发生变化，这种分支切换可能会产生遗留的副作用函数。

```js
const data = reactive({ ok: true, text: 'hello world' })
effect(function () {
  console.log(obj.ok ? obj.text : 'not')
})
```

解决：每次副作用函数执行时，先把它从所有与之关联的依赖集合中删除。

```js
// 用一个全局变量存储被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect(fn) {
  const effectFn = function () {
    // 调用 cleanup 函数完成清除工作
    cleanup(effectFn)
    // 当 effectFn 执行时，将其设置为当前激活的副作用函数
    activeEffect = effectFn
    fn()
  }
  // effect.deps 用来存储所有与该副作用函数相关联的依赖集合
  effectFn.deps = []
  // 执行副作用函数
  effectFn()
}
function cleanup(effectFn) {
  // 遍历 effectFn.deps 数组
  for (let i = 0; i < effectFn.deps.length; i++) {
    // deps 是依赖集合
    const deps = effectFn.deps[i]
    // 将 effectFn 从依赖集合中移除
    deps.delete(effectFn)
  }
  // 最后需要重置 effectFn.deps 数组
  effectFn.deps.length = 0
}

function reactive(data) {
  return new Proxy(data, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, newVal) {
      target[key] = newVal
      trigger(target, key)
    },
  })
}
const bucket = new WeakMap()
function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  // deps 就是一个与当前副作用函数存联系的依赖集合，将其添加到 activeEffect.deps 数组中
  activeEffect.deps.push(deps)
}
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  // effects && effects.forEach((effectFn) => effectFn())
  const effectToRun = new Set(effects)
  effectToRun && effectToRun.forEach((effectFn) => effectFn())
}

// 示例
const data = reactive({ ok: true, text: 'hello world' })
effect(function () {
  console.log(data.ok ? data.text : 'not')
})
data.ok = false
```

总结：

1. 副作用函数被新的函数包装，存储了副作用函数关联的依赖集合，且在执行副作用前会清除关联依赖集合中的副作用函数；
2. 调用 tack 跟踪字段变化时，会将对象字段的副作用依赖集合添加到副作用函数的关联依赖数组里；
3. 调用 trigger 触发变化时，需要拷贝关联依赖集合到新集合里，避免无限循环。

### 解决问题 2：嵌套 effect 与 effect 栈

问题：副作用函数是可以发生嵌套的，如下所示代码 effectFn1 内部嵌套了 effectFn2，由于 activeEffect 同时只能存储一个副作用函数，在发生嵌套时内部的副作用函数会覆盖掉外部副作用函数的注册。

```js
effect(function effectFn1() {
  effect(function effectFn2() {
    /* ... */
  })
  /* ... */
})
```

解决：使用一个副作用函数栈 effectStack，在副作用函数执行时，将当前副作用函数压入栈中，待副作用函数执行完毕后将其从栈中弹出，并终止让 activeEffect 指向栈顶的副作用函数。

```js
let activeEffect
// effect 栈
const effectStack = []
function effect(fn) {
  const effectFn = function () {
    cleanup(effectFn)
    activeEffect = effectFn
    // 在调用副作用函数之前将当前副作用函数压入栈中
    effectStack.push(effectFn)
    fn()
    // 在当前副作用函数执行完毕后，将当前副作用函数弹出栈，并把 activeEffect 还原为之前的值
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  effectFn.deps = []
  effectFn()
}
function cleanup(effectFn) {
  for (let i = 0; i < effectFn.deps.length; i++) {
    const deps = effectFn.deps[i]
    deps.delete(effectFn)
  }
  effectFn.deps.length = 0
}

function reactive(data) {
  return new Proxy(data, {
    get(target, key) {
      track(target, key)
      return target[key]
    },
    set(target, key, newVal) {
      target[key] = newVal
      trigger(target, key)
    },
  })
}
const bucket = new WeakMap()
function track(target, key) {
  if (!activeEffect) return
  let depsMap = bucket.get(target)
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map()))
  }
  let deps = depsMap.get(key)
  if (!deps) {
    depsMap.set(key, (deps = new Set()))
  }
  deps.add(activeEffect)
  activeEffect.deps.push(deps)
}
function trigger(target, key) {
  const depsMap = bucket.get(target)
  if (!depsMap) return
  const effects = depsMap.get(key)
  const effectToRun = new Set(effects)
  effectToRun && effectToRun.forEach((effectFn) => effectFn())
}

// 示例
function defineComponent(component) {
  let vnode
  let rendered = false
  const rawRender = component.render
  component.render = () => {
    if (!rendered) {
      rendered = true
      effect(() => {
        vnode = rawRender()
      })
    }
    return vnode
  }
  return component
}
const data = reactive({ text: 'hello world' })
const Bar = defineComponent({
  render() {
    console.log('bar', data.text)
  },
})
const Foo = defineComponent({
  render() {
    Bar.render()
    console.log('foo', data.text)
  },
})
Foo.render()
console.log('---')
data.text = 'hello vue'
```

总结：通过栈来存储副作用函数来解决问题，此外需要注意 effect 是比较底层的实现，上层使用需要二次封装。

### 解决问题 3：避免无限递归循环

### 解决问题 4：调度执行

### 封装应用 1：computed

TODO

### 封装应用 2：watch

TODO

### 封装应用 3：render

## 实现原理

### Proxy 和 Reflect

### 原始值的响应式方案

### 非原始值的响应式方案
