# taro3 + vue

## taro3 + vue3 + tsx

1. 项目初始化

    ```shell
    taro init taro3-vue3-tsx # 选择 vue3 =》 TypeScript
    ```

2. 配置 TSX

    - [`tsconfig.json` 的 `compilerOptions.jsx` 设置为 `'preserve'`](https://github.com/vuejs/jsx-next#in-typescript)
    - [`babel.config.js` 的 babel-preset-taro 设置开启 `vueJsx` ](https://github.com/NervJS/taro/blob/next/packages/babel-preset-taro/README.md#vuejsx)

3. 。。。

ps：注意部分事件的驼峰写法有问题！
