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
