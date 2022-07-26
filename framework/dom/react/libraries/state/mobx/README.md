# [mobx](https://zh.mobx.js.org/README.html)

## 概念

Action =》State =》Derived Value =》Reactions

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

## 参考文献

- [MobX 内部分治策略详解](http://divideandconquer.surge.sh/#1)
- [关于MobX，知无不言，言无不尽～](https://juejin.cn/post/6979095356302688286)
- [UI AS AN AFTERTHOUGHT](https://michel.codes/blogs/ui-as-an-afterthought)
- [How to decouple state and UI (a.k.a. you don’t need componentWillMount)](https://hackernoon.com/how-to-decouple-state-and-ui-a-k-a-you-dont-need-componentwillmount-cc90b787aa37)
