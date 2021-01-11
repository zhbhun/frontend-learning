# Umi

## 工作原理

运行时配置：`src/app.tsx`

1. `render(oldRender: Function)`
2. `patchRoutes({ routes })`
3. `getInitialState`

## 性能优化

- [如何做编译提速](https://umijs.org/guide/boost-compile-speed)
- [umi dev 和热加载都特别慢](https://github.com/umijs/umi/issues/1450)
- [热更新太慢](https://github.com/umijs/umi/issues/2288)

## 代码拆分

- [Optimize umi split chunk - 提供代码分割的最佳实践](https://github.com/umijs/umi/issues/2063)

## 常见问题

### 样式覆盖问题

- [https://wangdoc.com/ssh/index.html](https://github.com/umijs/umi/issues/4978)
- [less代码打包后混淆，产生重复代码](https://github.com/umijs/umi/issues/4260)
