# Hook

> Hook 是 React 16.8 的新增特性。它可以让你在不编写 class 的情况下使用 state 以及其他的 React 特性。

## 介绍

为什么？

- 缺少在组件之间复用状态逻辑的 API

    RenderProps 和 HOC 这类方案需要重新组织组件结构，使得代码难以理解。如果在 React DevTools 中观察过 React 应用，你会发现由 providers，consumers，高阶组件，render props 等其他抽象层组成的组件会形成“嵌套地狱”。

    使用 Hook 可以从组件中提取状态逻辑，使得这些逻辑可以单独测试并复用，Hook 使你在无需修改组件结构的情况下复用状态逻辑。 

- 复杂组件业务逻辑变得难以理解

    每个生命周期常常包含一些不相关的逻辑。例如，组件常常在 componentDidMount 和 componentDidUpdate 中获取数据。但是，同一个 componentDidMount 中可能也包含很多其它的逻辑，如设置事件监听，而之后需在 componentWillUnmount 中清除。相互关联且需要对照修改的代码被进行了拆分，而完全不相关的代码却在同一个方法中组合在一起。如此很容易产生 bug，并且导致逻辑不一致。

    为了解决这个问题，Hook 将组件中相互关联的部分拆分成更小的函数（比如设置订阅或请求数据），而并非强制按照生命周期划分。你还可以使用 reducer 来管理组件的内部状态，使其更加可预测。

- 难以理解的 class

    必须去理解 JavaScript 中 this 的工作方式，这与其他语言存在巨大差异。还不能忘记绑定事件处理器。

## [API](https://zh-hans.reactjs.org/docs/react-api.html#hooks)

- 实例

    - [useRef](https://zh-hans.reactjs.org/docs/hooks-reference.html#useref)
    - [useImperativeHandle](https://zh-hans.reactjs.org/docs/hooks-reference.html#useimperativehandle)

- 状态

    - [useState](https://zh-hans.reactjs.org/docs/hooks-reference.html#usestate)
    - [useContext](https://zh-hans.reactjs.org/docs/hooks-reference.html#usecontext)
    - [useReducer](https://zh-hans.reactjs.org/docs/hooks-reference.html#usereducer)

- 副作用

    - [useEffect](https://zh-hans.reactjs.org/docs/hooks-reference.html#useeffect)
    - [useLayoutEffect](https://zh-hans.reactjs.org/docs/hooks-reference.html#uselayouteffect)：会在所有 DOM 更新后同步执行该方法的回调，可以用它来来读取 DOM 布局并同步触发重渲染。在浏览器执行绘制之前，useLayoutEffect 内部的更新计划将被同步刷新。
    - [useInsertionEffect](https://zh-hans.reactjs.org/docs/hooks-reference.html#useinsertioneffect)：在所有 DOM 更新更新前同步执行该方法的回调，这会在 useLayoutEffect 之前执行，通常用于插入样式标签到 DOM 中，然后 useLayoutEffect 可以读取布局样式。

        [Know about the useInsertionEffect hook in React 18](https://blog.saeloun.com/2022/06/02/react-18-useinsertioneffect)

- 缓存

    - [useMemo](https://zh-hans.reactjs.org/docs/hooks-reference.html#usememo)
    - [useCallback](https://zh-hans.reactjs.org/docs/hooks-reference.html#usecallback)

- 其他

    - [useId](https://zh-hans.reactjs.org/docs/hooks-reference.html#useid)：用于生成唯一的 ID，且这个 ID 在服务端和客户端是一致的。
    - [useDebugValue](https://zh-hans.reactjs.org/docs/hooks-reference.html#usedebugvalue)：用于在 React 开发者工具中显示自定义 hook 的标签。
    - [useDeferredValue](https://zh-hans.reactjs.org/docs/hooks-reference.html#usedeferredvalue)：接受一个值，并在紧急的更新之后才返回一个新的值，通常用于防抖和节流。
    - [useTransition](https://zh-hans.reactjs.org/docs/hooks-reference.html#usetransition)：将 UI 更新标记为低优先级，这个方法会返回一个是否延迟的标志位和一个任务处理函数，将一个函数传递给这个任务处理函数，这个函数内执行的状态更新会被标记为低优先级，且可以让  Suspense 不会显示加载中的组件。
    - [useSyncExternalStore](https://zh-hans.reactjs.org/docs/hooks-reference.html#usesyncexternalstore)L=

## [教程](https://zh-hans.reactjs.org/docs/hooks-intro.html)

### 使用规则

1. 只能在 React 的函数组件中调用 Hook，不要在其他 JavaScript 函数中调用；
2. 只能在函数最外层调用 Hook，不要在循环、条件判断或者子函数中调用；

### useLayoutEffect

- [useLayoutEffect和useEffect的区别](https://zhuanlan.zhihu.com/p/348701319)
- [useEffect vs useLayoutEffect](https://kentcdodds.com/blog/useeffect-vs-uselayouteffect)
- [React useLayoutEffect vs. useEffect with examples](https://blog.logrocket.com/useeffect-vs-uselayouteffect-examples/)
- [嗨，useLayoutEffect，醒醒](https://juejin.cn/post/6859602611901825037)

### useMemo

- [React Hook重复渲染问题处理：useMemo, memo, useCallback](https://juejin.cn/post/7039216773710741535)

### useTransition

- [useTransition](https://zh-hans.reactjs.org/docs/hooks-reference.html#usetransition)
- [React 18新特性优先看之初探useTransition()](https://juejin.cn/post/7020621789172613157)
- [useTransition/useDerferredValue使用指南](https://blog.shabby.in/how-to-use-useTransition/useDerferredValue/)

### useSyncExternalStore

- [如何理解 React 18 中的 useSyncExternalStore ?](https://www.zhihu.com/question/502917860)
- [React18中的新特性——useSyncExternalStore](https://juejin.cn/post/7056588815170813965)

## 进阶

### 定时器

- [Making setInterval Declarative with React Hooks](https://overreacted.io/making-setinterval-declarative-with-react-hooks/)

### 节流/防抖

错误：

```tsx
const App = () => {
  const [value, setValue] = useState(0)
  // 下面的 throttle 每次执行都是一个新的函数，导致节流失效
  useEffect(throttle(() => console.log(value), 1000), [value])
  return (
    <button onClick={() => setValue(value + 1)}>{value}</button>
  )
}
```

正解：

- 1

    ```tsx
    import { throttle } from "lodash-es";
    import { useCallback, useEffect, useRef } from "react";

    function useThrottleFn(callback: () => void, time: number) {
      const instance = useRef({ callback });
      const throttledCallback = useCallback(
        throttle(() => {
          instance.current.callback();
        }),
        [time]
      );
      useEffect(() => {
        instance.current.callback = callback;
      }, [callback]);
      useEffect(() => {
        return () => {
          throttledCallback.cancel();
        };
      }, [throttledCallback]);
      return throttledCallback;
    }

    function Demo() {
      const [value, setValue] = useState(0);
      const printValue = useCallback(() => {
        console.log(value);
      }, [value]);
      const throttledPrintValue = useThrottleFn(printValue, 1000);
      useEffect(() => {
        throttledPrintValue;
      }, [value]);
      return <button onClick={() => setValue(value + 1)}>{value}</button>;
    }
    ```

- 2

    ```tsx
    import { throttle } from "lodash-es";
    import { useCallback, useEffect, useRef } from "react";

    function useThrottleEffect(callback: () => void, args: any[], time: number) {
      const instance = useRef({ callback });
      const throttledCallback = useCallback(
        throttle(() => {
          instance.current.callback();
        }),
        [time]
      );
      useEffect(() => {
        instance.current.callback = callback;
      }, callback);
      useEffect(() => {
        return () => {
          throttledCallback.cancel();
        };
      }, [throttledCallback]);
      useEffect(() => {
        throttledCallback();
      }, args)
      return throttledCallback;
    }

    function Demo() {
      const [value, setValue] = useState(0);
      const printValue = useCallback(() => {
        console.log(value);
      }, [value]);
      const throttledPrintValue = useThrottleFn(printValue, [value], 1000);
      return <button onClick={() => setValue(value + 1)}>{value}</button>;
    }
    ```

参考文献

- [How to use throttle or debounce with React Hook?](https://stackoverflow.com/questions/54666401/how-to-use-throttle-or-debounce-with-react-hook)
- [如何使用 React Hooks 实现防抖和节流](https://chinese.freecodecamp.org/news/debounce-and-throttle-in-react-with-hooks/)
- https://streamich.github.io/react-use/?path=/story/side-effects-usethrottle--docs
- https://ahooks.js.org/hooks/use-throttle
- https://ahooks.js.org/hooks/use-throttle-fn
- https://ahooks.js.org/hooks/use-throttle-effect
- [【笔记】可食用的react hook防抖及节流 | 拿走不谢](https://juejin.cn/post/6854573217349107725)



## 第三方库

- [useHooks](https://usehooks.com/useEventListener/)
- [react-use](https://github.com/streamich/react-use)
- [umijs/hooks](https://github.com/umijs/hooks)

## 常见问题

- [Preventing rerenders with React.memo and useContext hook.](https://github.com/facebook/react/issues/15156)
- [Some reasons for disliking React hooks](https://blog.bitsrc.io/some-reasons-for-disliking-react-hooks-80f1e18eb9b3)

### 取代 Redux

- [Are React hooks going to kill Redux?](https://www.reddit.com/r/reactjs/comments/9tto1x/are_react_hooks_going_to_kill_redux/)
- [Why can't Context API or Hooks API replace Redux?](https://hashnode.com/post/why-cant-context-api-or-hooks-api-replace-redux-cjou9ri5u005gnys1buolhd6j)
- [You Might Not Need Redux (But You Can’t Replace It With Hooks)](https://www.simplethread.com/cant-replace-redux-with-hooks/)
- [React's useReducer vs Redux](https://www.robinwieruch.de/redux-vs-usereducer/)
- [Creating a react-redux alternative with Hooks and Proxies](https://frontarm.com/daishi-kato/redux-custom-hooks/)
- [Seriously - do React hooks replace state containers?](https://dev.to/yakimych/seriously-do-react-hooks-replace-state-containers-3cpl)
- [useRedux — state management pattern with React Hooks](https://hackernoon.com/useredux-state-management-pattern-with-react-hooks-fa8e1413b9f1)
- [使用 React Hooks 代替 Redux](https://zhuanlan.zhihu.com/p/66020264)
- [2019，手把手教你用React Hooks解决状态管理（上）](https://zhuanlan.zhihu.com/p/57197424)
- [該不該用context api 來取代 redux?](https://medium.com/@nightspirit622/%E8%A9%B2%E4%B8%8D%E8%A9%B2%E7%94%A8context-api-%E4%BE%86%E5%8F%96%E4%BB%A3-redux-4d7395d5c8da)
- [React Hooks(三)：Redux-React-Hook](https://tecky.io/zh_Hant/blog/React%20Hooks(%E4%B8%89)%EF%BC%9ARedux-React-Hook/)
- [npm uninstall redux](https://medium.com/@nightspirit622/npm-uninstall-redux-c00d86683b0d)
- [State Management with React Hooks — No Redux or Context API](https://medium.com/javascript-in-plain-english/state-management-with-react-hooks-no-redux-or-context-api-8b3035ceecf8)
- [Replace Redux state with React Hooks and Context](https://itnext.io/replace-redux-state-with-react-hooks-and-context-7906e0fd5521)
- [Replacing redux with react hooks and context (part 1)](https://medium.com/octopus-labs-london/replacing-redux-with-react-hooks-and-context-part-1-11b72ffdb533)
- [Replacing redux with react hooks and context (part 2)](https://medium.com/octopus-labs-london/replacing-redux-with-react-hooks-and-context-part-2-838fd20e6739)
- [How to Replace Redux with React Hooks and the Context API](https://www.sitepoint.com/replace-redux-react-hooks-context-api/)
- [In 2019, Let me Replace Redux with React Hooks](https://juejin.im/post/5c63f8ed6fb9a049e30899e5)
- [Replacing Redux with Context and Hooks](http://brianyang.com/replacing-redux-with-context-and-hooks/)

- [How to Redux with React Hooks?](https://www.robinwieruch.de/redux-with-react-hooks/)
- [redux-react-hook](https://github.com/facebookincubator/redux-react-hook)

### useInsertionEffect 不支持 cleanup

- [useInsertionEffect in Strict mode with strict effects](https://github.com/reactjs/reactjs.org/issues/4825)


### react-hooks/exhaustive-deps 无法识别自定义 hook 返回的 useRef

- [Bug: react-hooks/exhaustive-deps complains about useRef encapsulated in custom hook](https://github.com/facebook/react/issues/20752)

## 参考文献

- [Making Sense of React Hooks](https://medium.com/@dan_abramov/making-sense-of-react-hooks-fdbde8803889)
- [React Hooks 深入不浅出](https://segmentfault.com/a/1190000017182184#articleHeader3)
- [React Hooks 在蚂蚁金服的实践](https://zhuanlan.zhihu.com/p/94030173)
- [深入理解：React hooks是如何工作的？](https://zhuanlan.zhihu.com/p/81528320)
- [简单聊一聊 hooks 与闭包](https://github.com/hacker0limbo/my-blog/issues/6)
- [Hooks FAQ](https://zh-hans.reactjs.org/docs/hooks-faq.html)
- [React Hooks(二): useCallback 之痛](https://zhuanlan.zhihu.com/p/98554943)
- [React Hooks 踩坑分享](https://www.infoq.cn/article/yqetdq5xuppo1zwghsvw)
- [从react hooks“闭包陷阱”切入，浅谈react hooks](https://juejin.cn/post/6844904193044512782)
- [React Hooks 第一期：聊聊 useCallback](https://zhuanlan.zhihu.com/p/56975681)
- [React Hooks 你真的用对了吗？](https://zhuanlan.zhihu.com/p/85969406)
- [深入React: hooks useCallback 问题](https://blog.staleclosure.com/react-hooks-useCallback/)
- [How to escape React Hooks Hell](https://blog.battlefy.com/how-to-escape-react-hooks-hell-a66c0d142c9e)
- [React.memo VS useMemo](https://medium.com/@anantsharma1310/react-memo-vs-usememo-9da3477646dc)
