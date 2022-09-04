# Ant Design

## 主题定制

- 修改样式文件覆盖样式变量；

    - antd/dist/antd.compact.less
    - antd/dist/antd.dark.less
    - antd/dist/antd.variable.less

- 通过编译属性 `lessOption` 修改样式变量；

    ant/dist/theme#getThemeVariables 提供了获取定制样式的方式

参考文献

- [如何在 Ant Design 中定制主题和实现动态主题](https://zhuanlan.zhihu.com/p/439672248)

## 切换主题

- 动态切换样式文件

    ps：古老笨重的方式。

- antd/dist/antd.variable.less + ConfigProvider

    ps：只能修改有限的几种颜色变量

- 覆盖组件样式 + 自定义 CSS Variables

    ps：由于 ant design less 文件里用了很多 less 函数进行颜色计算，所以不能直接把 less 变量值改成 CSS 变量，而要自行覆盖样式文件。

参考文献

- [如何在 Ant Design 中定制主题和实现动态主题](https://zhuanlan.zhihu.com/p/439672248)
