let activeEffect
// effect 栈
const effectStack = []
function effect(fn, options) {
  const effectFn = function () {
    cleanup(effectFn)
    activeEffect = effectFn
    effectStack.push(effectFn)
    fn()
    effectStack.pop()
    activeEffect = effectStack[effectStack.length - 1]
  }
  // 将 options 挂载到 effectFn 上
  effectFn.options = options
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
  const effectToRun = new Set()
  effects &&
    effects.forEach((effectFn) => {
      if (effectFn !== activeEffect) {
        effectToRun.add(effectFn)
      }
    })
  effectToRun &&
    effectToRun.forEach((effectFn) => {
      // 如果一个副作用函数存在调度器，则调用该调度器，并将副作用函数作为参数传递
      if (effectFn.options && effectFn.options.scheduler) {
        effectFn.options.scheduler(effectFn)
      } else {
        // 否则直接执行副作用函数
        effectFn()
      }
    })
}

// 定义一个任务队列
const jobQueue = new Set()
// 使用 Promise.resolve() 创建一个 promise 实例，我们用它将一个任务添加到微任务队列
const p = Promise.resolve()
// 一个标志代表是否正在刷新队列
let isFlushing = false
function flushJob() {
  // 如果队列正在刷新，则什么都不做
  if (isFlushing) return
  // 设置为 true，代表正在刷新
  isFlushing = true
  // 在微任务队列中刷新 hobQueue 队列
  p.then(() => {
    jobQueue.forEach((job) => job())
  }).finally(() => {
    // 结束后终止 isFlushing
    isFlushing = false
  })
}

function effectWithScheduler(fn) {
  return effect(fn, {
    scheduler(effectFn) {
      // 每次调度时，将副作用函数添加到 jobQueue 队列中
      jobQueue.add(effectFn)
      // 调用 flushJob 刷新队列
      flushJob()
    },
  })
}

// 示例
const obj = reactive({ text: 'hello world' })
effectWithScheduler(() => {
  console.log(obj.text)
})
obj.text = 'hello vue'
obj.text = 'hello ...'
