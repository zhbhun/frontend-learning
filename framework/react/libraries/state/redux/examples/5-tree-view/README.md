> 该示例展示了深层嵌套树状视图的渲染，以及为了方便 reducer 更新，state 的标准化写法。优良的渲染表现，来自于容器组件细粒度的、仅针对需要渲染的 tree node 的绑定。—— http://cn.redux.js.org/docs/introduction/Examples.html#tree-view

示例要点

- 深层嵌套树的存储数据结构：扁平 + ID
- 深层前套树的容器组件细粒度设计：每一个节点都连接到 store，保证渲染效率

# 需求
## 功能
- 显示节点
- 增加计数
- 增加子节点
- 删除子节点

## 原型

# 设计
节点

- 状态：id，parentId，counter，childIds
- 动作：increment，addChild，removeChild

# 实现
## 动作
- increment
- addChild
- removeChild
- addNode
- removeNode

## 状态
```
{
    [id]: {
        id: String,
        counter: Number,
        childIds: [Number]
    },
}
```

## 展示组件
None

## 容器组件
- Node
