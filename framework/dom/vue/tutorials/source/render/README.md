# 渲染

## 概念

- 渲染器：把虚拟 DOM 渲染为特定平台上的真实元素
- 虚拟 DOM：虚拟 DOM 是树型结构，这棵树中的任何一个 vnode 节点都可以是一棵子树
- 挂载：渲染器把虚拟 DOM 节点渲染为真实 DOM 节点的过程叫作挂载
- 容器：渲染器通常需要接收一个挂载点作为参数，用来指定具体的挂载位置，这个位置就是容器

## 原理

```js
function createRenderer() {
  function render(vnode, container) {

  }
  function hydrate(vnode, container) {

  }
}

const renderer = createRenderer()
// 首次渲染
renderer.render(oldVNode, document.querySelector('#app'))
// 第二次渲染
renderer.render(newVNode, document.querySelector('#app'))
```
