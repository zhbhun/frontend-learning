Counter 是一个简单的计数器应用，用户可以操作界面来加减界面上的数字。

- readux-counter-by-dom：基于 Redux 和 DOM 实现的计数器
- redux-counter-by-react：基于 Redux、React 实现的计数器
- redux-counter-by-react-redux：基于 Redux、React、react-redux 实现的计数器

# 总结
学完本示例，要清楚以下几点 redux 编程基础知识

- actions：用于创建动作，动作对象包含一个 type，其他的属性是动作参数；
- reduces：接受旧状态和动作对象，返回新的状态
- components：UI 组件
- comtainers：封装 UI 组件，提供状态监听，状态获取，动作封装；
- index.js：创建 store，渲染入口

另外，在运行示例的时候可以调试确认以下几点疑问

1. 在创建 store 的时候，会默认调用一次 reduce。所以，在编写 reduce 时，需要提供默认值；
2. ...
