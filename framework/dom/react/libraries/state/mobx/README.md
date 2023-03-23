# [mobx](https://zh.mobx.js.org/README.html)

- https://github.com/mobxjs/awesome-mobx

## 概念

Action =》State =》Derived Value =》Reactions

## 对比

| 特性/库 | mobx |  reudx |
| --- | --- | --- |
| 状态结构 | 分散的，mobx-state-tree 也可以 | 单一的 |
| 状态是否可变 | 可变状态 | 不可变状态 |
| 实现模式 | 面向对象 | 函数式编程，action + dispatch + reduce  |
| 更新模式 | 响应式 | 不可变的脏检查模式 |
| 运行性能 | 支持细粒度的响应式更新，但响应式模式存在额外的性能开销，如果变更的状态和范围较大时，可能存在性能问题 | 在更新较小的情况下，所有状态都要进行脏检查，存在性能损耗 |
| 其他方面 | React本身提供了利用不可变数据结构来减少无用渲染的机制，因此在配合可变的观察者模式的数据结构时并不是那么舒服。 | 无 |

参考文献

- [我为什么从Redux迁移到了Mobx](https://tech.youzan.com/mobx_vs_redux/)

## 基础

### 创建响应式对象的方式

- 普通对象

    ```js
    import { observable,action } from 'mobx'

    const counterStore = observable({
      value: 1
    })

    export const increase = action(()=>{
      counterStore.value += 1
    })

    export default counterStore
    ```

- 类 + 装饰器

    ```js
    import { observable } from 'mobx'

    class CounterStore {
      @observable value = 1
      @action increase() {
        this.value += 1
      }
    }

    export default new CounterStore()
    ```

- 类 + makeObservable

    ```js
    import { makeObservable, observable, action } from 'mobx'

    class CounterStore {
      value = 1

      constructor() {
        makeObservable(this, {
          value: observable,
          increase: action
        })
      }

      increase() {
        this.value += 1
      }
    }
    ```

### React 集成

- 全局

    ```js
    import { observer } from "mobx-react";

    const Counter = observer(() => {
      const { value, increase } = counterStore;
      return <button onClick={increase}>{value}</button>
    })
    ```

- Provider、inject
- context + hooks

    ```js
    import { useContext } from "react";
    import { Provider, observer } from "mobx-react";

    const counterStoreContext = React.createContext(counterStore)

    const App = () => {
      return (
        <Provider value={rootStore}>
          {...}
        </Provider>
      )
    }

    const Counter = observer(() => {
      const { value, increase } = useContext(counterStoreContext);
      return <button onClick={increase}>{value}</button>
    })
    ```

- useLocalObservable + useObserver

    ```js
    import { useLocalObservable, useObserver } from "mobx-react-lite";

    const Counter = () => {
      const counter = useLocalObservable(() => ({
        value: 0,
        increase(){
          this.value += 1
        }
      }))
      return useObserver(() => <button onClick={counter.increase}>{counter.value}</button>)
    }
    ```

## 进阶

### [mobx-utils](https://github.com/mobxjs/mobx-utils)

> Utility functions and common patterns for MobX

## 参考文献

- [MobX 内部分治策略详解](http://divideandconquer.surge.sh/#1)
- [关于MobX，知无不言，言无不尽～](https://juejin.cn/post/6979095356302688286)
- [UI AS AN AFTERTHOUGHT](https://michel.codes/blogs/ui-as-an-afterthought)
- [How to decouple state and UI (a.k.a. you don’t need componentWillMount)](https://hackernoon.com/how-to-decouple-state-and-ui-a-k-a-you-dont-need-componentwillmount-cc90b787aa37)
