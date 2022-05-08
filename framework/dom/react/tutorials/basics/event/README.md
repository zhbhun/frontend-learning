# 事件处理

## 基础

### JSX VS HTML

- React 事件的命名采用小驼峰式（camelCase），而不是纯小写；
- 使用 JSX 语法时你需要传入一个函数作为事件处理函数，而不是一个字符串；
- 在 React 中另一个不同点是你不能通过返回 false 的方式阻止默认行为，必须显式的使用 preventDefault。
- react 修改了 dom 中的 onchange 事件的触发逻辑，dom 中再输入框失去焦点时才会触发，而 react 是用户有输入就会触发。

### 合成事件属性

```ts
boolean bubbles // 是否冒泡
boolean cancelable // 是否可取消
DOMEventTarget currentTarget // 当前目标
boolean defaultPrevented // 是否组织默认行为
number eventPhase // 事件阶段
boolean isTrusted // ?
DOMEvent nativeEvent // 原生事件
void preventDefault() // 组织默认行为
boolean isDefaultPrevented() // 是否组织了默认行为
void stopPropagation() // 组织冒泡
boolean isPropagationStopped() // 是否组织了冒泡行为
void persist() // 从 v17 开始，e.persist() 将不再生效
DOMEventTarget target // 目标
number timeStamp // 时间
string type // 事件类型
```

ps：合成事件与浏览器的原生事件不同，也不会直接映射到原生事件。例如，在 onMouseLeave 事件中 event.nativeEvent 将指向 mouseout 事件。

### [支持的事件](https://zh-hans.reactjs.org/docs/events.html#supported-events)

- 表单
- 焦点
- ...

## 参考文献

- [事件处理](https://zh-hans.reactjs.org/docs/handling-events.html)
- [合成事件](https://zh-hans.reactjs.org/docs/events.html)
- [React: Event Bubbling and Capturing](https://www.robinwieruch.de/react-event-bubbling-capturing/)
