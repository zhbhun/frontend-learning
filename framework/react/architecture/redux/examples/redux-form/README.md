- [官方文档](http://redux-form.com/6.4.3/)


# 状态结构
```javascript
{
  [reducerName: string]: { // reducer 名称
    [formKey: string]: { // 表单唯一标识
      registeredFields: [
        {
          name: string, // 表单字段名称
          type: 'Field', // ?
        },
        // ...
      ],
      fields: {
        [filedName: string]: {
          visited: boolean, // 字段获取过焦点
          touched: boolean, // 同上，但不一定是获取焦点，例如：提交表单时会将所有字段的 touched 设置为 true
        },
      },
      values: {
        firstName: boolean | number | string, // 字段值
      },
      anyTouched: boolean,
      submitSucceeded: boolean,
    },
  },
}
```


# 生命周期
## 初始化
```javascript
// 注册字段
{
  type: '@@redux-form/REGISTER_FIELD',
  meta: {
    form: string, // 表单唯一标识
  },
  payload: {
    name: string, // 表单字段名称
    type: 'Field', // ?
  },
}
```

## 修改字段
```javascript
// 获取焦点
{
  type: '@@redux-form/FOCUS',
  meta: {
    form: string, // 表单唯一标识
    field: string, // 字段名称
  },
}
// 修改字段
{
  type: '@@redux-form/CHANGE',
  meta: {
    form: string, // 表单唯一标识
    field: string, // 字段名称
    touch: false, // ?
    persistentSubmitErrors: false, // ?
  },
  payload: boolean | number | string, // 字段新值
}
// 失去焦点
{
  type: '@@redux-form/BLUR',
  meta: {
    form: string, // 表单唯一标识
    field: string, // 字段名称
    touch: true， // ？
  },
  payload: boolean | number | string， // 字段当前值
}
```

## 提交
```javascript
// ???
{
  type: '@@redux-form/TOUCH',
  meta: {
    form: string, // 表单唯一标识
    fields: string[], // 字段名称数组
  },
}
// 提交前 
{
  type: '@@redux-form/START_SUBMIT',
  meta: {
    form: string, // 表单唯一标识
  },
}
// 提交后
{
  type: '@@redux-form/STOP_SUBMIT',
  meta: {
    form: string, // 表单唯一标识
  },
}
// 提交成功
{
  type: '@@redux-form/SET_SUBMIT_SUCCEEDED',
  meta: {
    form: string, // 表单唯一标识
    fields: [], // ?
  },
  error: false, // ?
}
```

# 思考
- 必填字段：字段未获取焦点时不显示错误信息，表单提交时显示未填写的必填字段错误信息
