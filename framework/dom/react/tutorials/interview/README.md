## React 18 有哪些新变化？

- 新的创建方式：现在是要先通过 createRoot() 创建一个 root 节点，然后该 root 节点来调用 render() 方法；
- 自动批处理优化：批处理：React 将多个状态更新分组到一个重新渲染中以获得更好的性能。（将多次 setstate 事件合并）；

    ps：在 v18 之前只在事件处理函数中实现了批处理，在 v18 中所有更新都将自动批处理，包括 promise 链、setTimeout 等异步代码以及原生事件处理函数；

- 并发渲染机制：根据用户的设备性能和网速对渲染过程进行适当的调整，保证 React 应用在长时间的渲染过程中依旧保持可交互性，避免页面出现卡顿或无响应的情况，从而提升用户体验。
- startTransition：主动降低优先级。比如「搜索引擎的关键词联想」，用户在输入框中的输入希望是实时的，而联想词汇可以稍稍延迟一会儿。我们可以用 startTransition 来降低联想词汇更新的优先级；
- useId：主要用于 SSR 服务端渲染的场景，方便在服务端渲染和客户端渲染时，产生唯一的 id；

## 并发模式是如何执行的？

React 中的并发，并不是指同一时刻同时在做多件事情。因为 js 本身就是单线程的（同一时间只能执行一件事情），而且还要跟 UI 渲染竞争主线程。若一个很耗时的任务占据了线程，那么后续的执行内容都会被阻塞。为了避免这种情况，React 就利用 fiber 结构和时间切片的机制，将一个大任务分解成多个小任务，然后按照任务的优先级和线程的占用情况，对任务进行调度。

- 对于每个更新，为其分配一个优先级 lane，用于区分其紧急程度。
- 通过 Fiber 结构将不紧急的更新拆分成多段更新，并通过宏任务的方式将其合理分配到浏览器的帧当中。这样就能使得紧急任务能够插入进来。
- 高优先级的更新会打断低优先级的更新，等高优先级更新完成后，再开始低优先级更新。

## 如何实现组件的懒加载

- react lazy / [react-loadable](https://github.com/jamiebuilds/react-loadable) / [loadable-components](https://github.com/gregberge/loadable-components)
- react suspense 的作用和最佳实践
- react suspense 和 useTransition 的结合

## 如何实现一个定时器的 hook

问题

https://codesandbox.io/s/react-hook-interval-xc7fmw

题解

1. useEffect 依赖

    ```tsx
    const App = () => {
      const [count, setCount] = useState(0);
        
      useEffect(() => {
        const timer = setTimeout(() => {
          setCount(count + 1);
        }, 1000);
        return () => clearTimout(timer);
      }, [count]);
    
      return <div>{count}</div>;
    };  
    ```

2. 回调方式

    ```tsx
    const App = () => {
      const [count, setCount] = useState(0);
        
      useEffect(() => {
        const timer = setInterval(() => {
          setCount(count => count + 1);
        }, 1000);
        return () => clearInterval(timer);
      }, [count]);
    
      return <div>{count}</div>;
    };  
    ```

3. 封装 Hook

    ```tsx
    const useInterval = (callback: () => void, delay: number | null): void => {
      const savedCallback = useRef(callback);
    
      useEffect(() => {
        savedCallback.current = callback;
      });
    
      useEffect(() => {
        function tick() {
          savedCallback.current();
        }
        if (delay !== null) {
          const id = setInterval(tick, delay);
          return () => clearInterval(id);
        }
      }, [delay]);
    };
    ```

---

## 组件的通信方式？

## 组件代码的复用逻辑？

## 受控组件和非受控组件

## key 属性的作用和 DOM Diff 算法？

## 触发组件重新渲染的原因和优化策略？

## 如何防止函数被多次调用?

## 基于 Hook 实现写一个节流或防抖钩子

## 请解释可变对象和不可变对象之间的区别？

- 什么是 JavaScript 中的不可变对象的例子？

    - 可变对象：在创建之后是可以被改变的。

        在 JavaScript 中，string 和 number 从设计之初就是不可变(Immutable)。

    - 不可变对象：在创建之后是不可以被改变的。

- 不变性有什么优点和缺点？

    不可变，其实是保持一个对象状态不变，这样做的好处是使得开发更加简单，可回溯，测试友好，减少了任何可能的副作用。但是，每当你想添加点东西到一个不可变(Immutable)对象里时，它一定是先拷贝已存在的值到新实例里，然后再给新实例添加内容，最后返回新实例。相比可变对象，这势必会有更多内存、计算量消耗。

- 你如何在自己的代码中实现不变性？

    - 解构
    - https://immerjs.github.io/immer/
    - https://immutable-js.com/

## 状态为什么要选择不可变？

- 简化复杂的功能：不可变性使得复杂的特性更容易实现，例如：”时间旅行“。
- 跟踪数据的改变：如果直接修改数据，那么就很难跟踪到数据的改变。跟踪数据的改变需要可变对象可以与改变之前的版本进行对比，这样整个对象树都需要被遍历一次。跟踪不可变数据的变化相对来说就容易多了。如果发现对象变成了一个新对象，那么我们就可以说对象发生改变了。

## hook 底层是怎么实现的？

    底层实现上，React 会维护一个钩子调用的堆栈，并且为每个组件分配一个唯一的调用顺序。每当一个组件调用了 useState 钩子时，React 会在堆栈中查找这个组件的调用顺序，并且根据这个顺序返回对应的状态和状态更新函数。

## 参考文献

- [reactjs-interview-questions](https://github.com/semlinker/reactjs-interview-questions)
- [必须要会的 50 个 React 面试题](https://juejin.im/post/6844903806715559943)
