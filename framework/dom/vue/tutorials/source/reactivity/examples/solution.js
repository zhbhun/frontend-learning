// 用一个全局变量存储被注册的副作用函数
let activeEffect
// effect 函数用于注册副作用函数
function effect(fn) {
  activeEffect = fn
  fn()
}

// 存储副作用函数的桶
const bucket = new WeakMap()
function reactive(data) {
  return new Proxy(data, {
    // 拦截读取操作
    get(target, key) {
      // 将副作用函数 activeEffect 添加到存储副作用函数的桶中
      track(target, key)
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
