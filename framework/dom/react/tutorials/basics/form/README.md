# 表单

## 基础

| Element | Value property | Default Value | Change callback | New value in the callback |
| --- | --- | --- | --- | --- |
| `<input type="text|password|color|date|time|range" />` | `value="string"` | `defaultValue="string"` | `onChange` | `event.target.value` |
| `<input type="checkbox" />` | `checked={boolean}` | `defaultChecked={boolean}` | `onChange` | `event.target.checked` |
| `<input type="radio" />` | `checked={boolean}` | `defaultChecked={boolean}` | `onChange` | `event.target.checked` |
| `<textarea />` | `value="string"` | `defaultValue="string"` | `onChange` | `event.target.value` |
| `<select />` | `value="option value"` | `defaultValue="string"` | `onChange` | `event.target.value` |
| `<input type="file" />` | 不支持（非受控组件） | ? | `onChange` | `event.target.value` |

## 进阶

### 受控组件 VS 非受控组件

- 非受控组件：如果组件输入值变化不会引起 UI 变化，那么可以优先考虑非受控组件；
- 受控组件：适用于需要监听用户输入并做相关的联动处理（如：校验）。

| 特性 | 非受控组件 | 受控组件 |
| --- | --- | --- |
| 字段值读取 | ✅ | ✅ |
| 表单提交校验 | ✅ | ✅ |
| 实时字段校验 | ❌ | ✅ |
| 跟进输入禁用按钮 | ❌ | ✅ |
| 强制输入内容格式 | ❌ | ✅ |

ps：非受控组件适用于只要考虑表单最终提交的场景。

### Input VS Change

- [In React, what's the difference between onChange and onInput? 在反应中，onChange 和 onInput ](https://stackoverflow.com/questions/38256332/in-react-whats-the-difference-between-onchange-and-oninput)

## 参考

- [表单](https://zh-hans.reactjs.org/docs/forms.html)
- [非受控组件](https://zh-hans.reactjs.org/docs/uncontrolled-components.html)
- [Controlled and uncontrolled form inputs in React don't have to be complicated](https://goshacmd.com/controlled-vs-uncontrolled-inputs-react/)
