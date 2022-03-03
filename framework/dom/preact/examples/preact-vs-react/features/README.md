# 功能对比

## 开发工具

| 特性| react | preact |
| --- | --- | --- |
| Inspector | ✔ | ✔ |
| Profiler | ✔ | ✔ |

备注：preact 有自己的开发者调试工具， 参见[Debugging Preact Apps](https://preactjs.com/guide/v10/debugging/)。

## PropTypes

Preact 需要在项目的最开始引入 `preact/debug`，才能正常使用 PropTypes，参考 [PropTypes for Preact](https://github.com/preactjs/preact/issues/902#issuecomment-469626883)。

- react：✔
- preact：✔

问题：Preact 目前的版本（10.x）虽然支持了 PropTypes，但是校验的输出信息无法定位到具体是哪个组件验证不通过。

## APIS

| api | react | preact/compact
| --- | --- | --- |
| Children | ✔ | ✔ |
| Component | ✔ | ✔ |
| Fragment | ✔ | ✔ |
| Profiler | ✔ | ✘ |
| PureComponent | ✔ | ✔ |
| StrictMode | ✔ | ✘ |
| Suspense | ✔ | ✔ |
| SuspenseList | ✘ | ✔ |
| cloneElement | ✔ | ✔ |
| createContext | ✔ | ✔ |
| createElement | ✔ | ✔ |
| createFactory | ✔ | ✔ |
| createPortal | ✔ | ✔ |
| createRef | ✔ | ✔ |
| findDOMNode | ✔ | ✔ |
| flushSync | ✔ | ✘ |
| forwardRef | ✔ | ✔ |
| hydrate | ✔ | ✔ |
| isValidElement | ✔ | ✔ |
| lazy | ✔ | ✔ |
| memo | ✔ | ✔ |
| render | ✔ | ✔ |
| unmountComponentAtNode | ✔ | ✔ |
| useCallback | ✔ | ✔ |
| useContext | ✔ | ✔ |
| useDebugValue | ✔ | ✔ |
| useEffect | ✔ | ✔ |
| useImperativeHandle | ✔ | ✔ |
| useLayoutEffect | ✔ | ✔ |
| useMemo | ✔ | ✔ |
| useReducer | ✔ | ✔ |
| useRef | ✔ | ✔ |
| useState | ✔ | ✔ |

总结：Preact 不支持 StricMode 和 Profiler

## Children

Preact 不支持 null 类型的 children，子组件实际拿到的是 undefined。

| child | react | preact/compact
| --- | --- | --- |
| undefined | ✔ | ✔ |
| null | ✔ | ✘ |
| null | ✔ | ✔ |
| bool | ✔ | ✔ |
| number | ✔ | ✔ |
| string | ✔ | ✔ |
| object | ✔ | ✔ |
| array | ✔ | ✔ |
| function | ✔ | ✔ |

## Render

React 的 rendder 函数不支持返回 undefined，preact 返回 undefine 相等于返回 null。react 和 preact 的 render 函数返回布尔值时，渲染内容都为空。

| child | react | preact/compact
| --- | --- | --- |
| undefined | ✘ | ✔ |
| null | ✔ | ✔ |
| bool | ✔ | ✔ |
| number | ✔ | ✔ |
| string | ✔ | ✔ |
| object | ✔ | ✔ |
| array | ✔ | ✔ |
| function | ✔（警告） | ✘ |

# Event

React 的事件处理函数获取到的事件是合成事件，真正的原生事件在 nativeEvent 属性上，而 preact 的事件处理程序获取到的直接就是合成事件，并且绑定了一个 nativeEvent 属性，并且指向自己。
