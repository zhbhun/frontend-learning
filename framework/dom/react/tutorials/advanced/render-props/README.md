# Render Props

## 用法

1. 注意避免 renderProps 方法在渲染时反复创建，导致子组件必须要的重复渲染；

    ps：Class 组件可以使用类属性方法，Function 组件可以使用 useCallback 或者 useMemo

## 应用案例

- React Router
- Downshift
- Formik

## 参考

- [Render Props](https://zh-hans.reactjs.org/docs/render-props.html)
