# 生命周期

## 基础

### 生命周期函数

- Legacy Class
- 16.3+：Modern Class
- 16.8+：Hook

参考文献

- https://projects.wojtekmaj.pl/react-lifecycle-methods-diagram/
- [Understanding the React Component Lifecycle](http://busypeoples.github.io/post/react-component-lifecycle/)

#### Legacy Class

- 挂载：constructor() >> componentWillMount() >> render() >> componentDidMount()
- 更新：

    - 属性：componentWillReceiveProps() >> shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
    - 状态：shouldComponentUpdate() >> componentWillUpdate() >> render() >> componentDidUpdate()
    - 强刷：render() >> componentDidUpdate()

- 错误：componentDidCatch
- 销毁：componentWillUnmount()

#### Modern Class

- 挂载：constructor() >> static getDerivedStateFromProps() >> render() >> componentDidMount()
- 更新：

    - 属性/状态：static getDerivedStateFromProps() >> shouldComponentUpdate() >> render() >> getSnapshotBeforeUpdate() >> componentDidUpdate()
    - 强刷：static getDerivedStateFromProps() >> srender() >> getSnapshotBeforeUpdate() >> componentDidUpdate()

    ps：16.3.x 版本的 `static getDerivedStateFromProps()` 只会在属性变化的时候才执行。

    [The minor release of 16.4 causes BREAKING changes in getDerivedStateFromProps](https://github.com/facebook/react/issues/12898)

- 错误：componentDidCatch
- 销毁：componentWillUnmount()

#### Hook

- `useEffect(() => () => void, [])`：在首次渲染时执行副作用函数，副作用函数可以返回一个函数，该函数会在组件销毁时执行
- `useEffect(() => () => void, [...dep])`：在每次依赖变化时执行副作用函数，副作用函数可以返回一个函数，该函数会在新的副作用函数处理前执行

### 错误边界处理

要点：

1. 渲染错误会导致整个组件树卸载；
2. 声明周期和渲染函数里面的错误才会被捕获，其他事件处理和异步逻辑不会被捕获；

参考

- [Error Handling in React 16](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html#introducing-error-boundaries)
- [Introducing Error Boundaries](https://reactjs.org/blog/2017/07/26/error-handling-in-react-16.html#introducing-error-boundaries)
- [componentDidCatch()](https://reactjs.org/docs/react-component.html#componentdidcatch)

## 进价

- getDerivedStateFromProps 不能和旧的生命周期函数一起使用（旧的生命周期不会被调用）；
- componentDidCatch 只能捕获子节点的异常，而且异常必须是在生命周期函数里抛出的；

### 为什么数据获取要在 componentDidMount 中进行?

> 1. 如果使用服务端渲染的话，componentwillMount 会在服务端和客户端各自执行一次，这会导致请求两次；
> 2. 在 Fiber 之后，由于任务可中断，componentwillMount 可能会被执行多次(fiber 算法是异步渲染，异步的渲染，很可能因为高优先级任务的出现而打断现有任务导致 componentWillMount 就可能执行多次)；
> 3. willMount会被废弃，目前被标记为不安全；
> 4. 节省的时间非常少，跟其他的延迟情况相比，这个优化可以使用九牛一毛的形容；

### getDerivedStateFromProps 为什么不提供上一个 props？

- prevProps 参数在第一次调用 getDerivedStateFromProps（实例化之后）时为 null，需要在每次访问 prevProps 时添加 if-not-null 检查。
- 在 React 的未来版本中，不传递上一个 props 给这个方法是为了释放内存。（如果 React 无需传递上一个 props 给生命周期，那么它就无需保存上一个 props 对象在内存中。）

### 什么时候使用 getDerivedStateFromProps / componentWillReceiveProps

使用场景：基于 props 更新 state。

- 通过 props 的 offset 变化时，修改当前的滚动方向；

    ```js
    class ExampleComponent extends React.Component {
      // 在构造函数中初始化 state，
      // 或者使用属性初始化器。
      state = {
        isScrollingDown: false,
        lastRow: null,
      };
    
      static getDerivedStateFromProps(props, state) {
        if (props.currentRow !== state.lastRow) {
          return {
            isScrollingDown: props.currentRow > state.lastRow,
            lastRow: props.currentRow,
          };
        }
    
        // 返回 null 表示无需更新 state。
        return null;
      }
    }
    ```

- 根据 props 变化重置状态；

    ```js
    class ExampleComponent extends React.Component {
      state = {
        externalData: null,
      };

      static getDerivedStateFromProps(props, state) {
        // 保存 prevId 在 state 中，以便我们在 props 变化时进行对比。
        // 清除之前加载的数据（这样我们就不会渲染旧的内容）。
        if (props.id !== state.prevId) {
          return {
            externalData: null,
            prevId: props.id,
          };
        }
        // 无需更新 state
        return null;
      }

      componentDidMount() {
        this._loadAsyncData(this.props.id);
      }

      componentDidUpdate(prevProps, prevState) {
        if (this.state.externalData === null) {
          this._loadAsyncData(this.props.id);
        }
      }

      componentWillUnmount() {
        if (this._asyncRequest) {
          this._asyncRequest.cancel();
        }
      }

      render() {
        if (this.state.externalData === null) {
          // 渲染加载状态 ...
        } else {
          // 渲染真实 UI ...
        }
      }

      _loadAsyncData(id) {
        this._asyncRequest = loadMyAsyncData(id).then(
          externalData => {
            this._asyncRequest = null;
            this.setState({externalData});
          }
        );
      }
    }
    ```

误区：避免直接使用 getDerivedStateFromProps / componentWillReceiveProps 来生成派生状态。

- 混用受控组件和非受控组件

    - 直接复制 props 到 state 上；

        有些初学者以为 getDerivedStateFromProps 和 componentWillReceiveProps 只会在 props “改变”时才会调用。实际上只要父级重新渲染时，这两个生命周期函数就会重新调用，不管 props 有没有“变化”。所以，在这两个方法内直接复制（unconditionally）props 到 state 是不安全的。
    
        ```js
        class EmailInput extends Component {
          state = { email: this.props.email };
          render() {
            return <input onChange={this.handleChange} value={this.state.email} />;
          }
          handleChange = event => {
            this.setState({ email: event.target.value });
          };
          componentWillReceiveProps(nextProps) {
            // 这会覆盖所有组件内的 state 更新！
            this.setState({ email: nextProps.email });
          }
        }
        ```

        上面的示例 state 的值来源于 props，是个受控组件，但同时内部也会监听输入来更新 satte，在其他 props 变化时会导致内部状态丢失。

    - 如果 props 和 state 不一致就更新 state；

        虽然可以解决上面的问题，但在一些复杂场景下仍然存在漏洞，例如：单个组件 props 没有变化，但也要清除内部状态的场景，详情参考示例 https://codesandbox.io/s/mz2lnkjkrx?file=/EditAccountForm.js:569-591。

- 有时候需要根据 props 计算属性值，为了节省性能会使用 getDerivedStateFromProps / componentWillReceiveProps 判断 props 变化才计算新的值。

    ```js
    class Example extends Component {
      state = {
        filterText: "",
      };
      static getDerivedStateFromProps(props, state) {
        // 列表变化或者过滤文本变化时都重新过滤。
        // 注意我们要存储 prevFilterText 和 prevPropsList 来检测变化。
        if (
          props.list !== state.prevPropsList ||
          state.prevFilterText !== state.filterText
        ) {
          return {
            prevPropsList: props.list,
            prevFilterText: state.filterText,
            filteredList: props.list.filter(item => item.text.includes(state.filterText))
          };
        }
        return null;
      }
    
      handleChange = event => {
        this.setState({ filterText: event.target.value });
      };
    
      render() {
        return (
          <Fragment>
            <input onChange={this.handleChange} value={this.state.filterText} />
            <ul>{this.state.filteredList.map(item => <li key={item.id}>{item.text}</li>)}</ul>
          </Fragment>
        );
      }
    }
    ```

解决：使用非受控组件虽然可以节省一些父子组件的通信代码，但有时还是需要同步父组件的 props，面对这种场景我们尽量避免混用受控和非受控，使用简单一些的状态重置逻辑。

1. 完全受控组件，这样就不会出现错误覆盖内部状态，或者内部状态无法同步重置的问题；
2. 有 key 的非受控组件；
3. 用 prop 的 ID 重置非受控组件（可以选择性的重置部分，这是 getDerivedStateFromProps / componentWillReceiveProps 使用场景）；

    ```js
    class EmailInput extends Component {
      state = {
        email: this.props.defaultEmail,
        prevPropsUserID: this.props.userID
      };
      static getDerivedStateFromProps(props, state) {
        // 只要当前 user 变化，重置所有跟 user 相关的状态。这个例子中，只有 email 和 user 相关。
        if (props.userID !== state.prevPropsUserID) {
          return {
            prevPropsUserID: props.userID,
            email: props.defaultEmail
          };
        }
        return null;
      }
      // ...
    }
    ```

4. 使用 ref 引用实例方法重置非受控组件；
5. 计算属性可以使用 memoization 来缓存计算；

    ```js
    import memoize from "memoize-one";
    
    class Example extends Component {
      // state 只需要保存当前的 filter 值：
      state = { filterText: "" };
    
      // 在 list 或者 filterText 变化时，重新运行 filter：
      filter = memoize(
        (list, filterText) => list.filter(item => item.text.includes(filterText))
      );
    
      handleChange = event => {
        this.setState({ filterText: event.target.value });
      };
    
      render() {
        // 计算最新的过滤后的 list。
        // 如果和上次 render 参数一样，`memoize-one` 会重复使用上一次的值。
        const filteredList = this.filter(this.props.list, this.state.filterText);
    
        return (
          <Fragment>
            <input onChange={this.handleChange} value={this.state.filterText} />
            <ul>{filteredList.map(item => <li key={item.id}>{item.text}</li>)}</ul>
          </Fragment>
        );
      }
    }
    ```

参考

- [什么时候使用派生 state](https://zh-hans.reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html#when-to-use-derived-state)

### 为什么废弃 react 旧的生命周期函数？

1. 因为 fiber 的出现，很可能因为高优先级任务的出现而打断现有任务导致被废弃的那几个生命周期函数会被执行多次；
2. componentwillMount 完全可以由 constructor 和 componentDidMount 代替；
3. getDerivedStateFromProps 是静态方法，在这里不能使用 this，也就是一个纯函数，开发者不能写出副作用的代码；
4. componentWillUpdate 类似 componentwillMount，可以由 componentDidUpdate 代替；

---

getDerivedStateFromProps VS componentWillReceiveProps

- 使用场景：需要根据属性变化来更新组件内部状态
- 使用误区：使用内部状态来暂存基于属性计算出来的值（可以在 render 里计算，利用 [memoize-one](https://github.com/alexreardon/memoize-one) 做缓存）
- 错误用法：

    - 每次都更新内部状态
    - 属性和状态不匹配的时候就更新内部状态

- 解决方案

    - 使用完全控制的组件（没有内部状态）
    - 使用完全不受控制的组件，声明时指定一个 key
    - 根据 id 属性重置不受控制组件的内部状态
    - 使用不受控制组件上的实例方法来重置内部状态

参考文献

- [为什么废弃react生命周期函数？](https://segmentfault.com/a/1190000021272657)
- [You Probably Don't Need Derived State](https://reactjs.org/blog/2018/06/07/you-probably-dont-need-derived-state.html)

### 旧版生命周期的兼容方案

- [react-lifecycles-compat](https://github.com/reactjs/react-lifecycles-compat)

### State 的更新可能是异步的

- 同步：事件回调处理
- 异步：生命周期函数

总结：总是使用 setState 回调函数的状态和属性传参来获取最新值。

TODO: 18.x 有变化

参考文献

- [今天让你彻底搞懂setState是同步还是异步](https://zhuanlan.zhihu.com/p/350332132)

## 参考文献
