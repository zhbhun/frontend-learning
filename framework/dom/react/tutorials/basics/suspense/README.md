## FAQ

- lazy 组件只有在加载成功后才会渲染，其他与正常的组件使用没有差别，并没有提供回调函数通知完成加载
- lazy 组件是一个对象，其结构如下

    ```js
    {
      $$typeof: Symbol.for('react.lazy'),
      _init: function (payload) {},
      _payload: {
        _status: -1 | 0 | 1 | 2,
        _result: object, // 模块
      },
      defaultProps: object,
      propTypes: object,
    }
    ```

- 可以使用 Suspend 来包裹动态加载的组件，实现加载中的样式
- 放在 Suspend 下的非动态子组件也会受其他动态子组件影响，初始化的时候会渲染一次，但是不会触发 effect
- 嵌套在深层的动态子组件也会触发 Suspend fallback，并且导致整颗组件树销毁
- Suspend 里的 fallback 里有 lazy 组件的话，Suspend 会等待懒加载组件完成加载后再渲染

## 参考文献

- [A Fundamental Guide To React Suspense](https://www.chakshunyu.com/blog/a-fundamental-guide-to-react-suspense/)
- https://blog.logrocket.com/lazy-loading-components-in-react-16-6-6cea535c0b52/
