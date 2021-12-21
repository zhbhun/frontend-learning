# 安装

## vue3

- [uni-app 项目支持 vue 3.0介绍，及升级指南](https://ask.dcloud.net.cn/article/id-37834__page-7)
- [在setup中怎样引用使用onshow onload 声明周期函数](https://ask.dcloud.net.cn/question/129127)
- [如何使用vue3](https://ask.dcloud.net.cn/article/39310)

缺陷

- [ ] 暂不支持 setup 语法糖

## TypeScript

- [ATQQ/uni-vue3-ts-template](https://github.com/ATQQ/uni-vue3-ts-template)
- [实践：使用vue-cli搭建一个Vue3-TS的uni-app工程化项目模板(中)](https://juejin.cn/post/6976906597263998989)

## VSCode

- 脚手架

    ```shell
    npm install -g @vue/cli
    vue create -p dcloudio/uni-preset-vue my-project # vue2
    vue create -p dcloudio/uni-preset-vue#vue3 my-vue3-project # vue3
    ```

- 编辑器配置

    ```json
    {
      "files.associations": {
        "*.json": "jsonc"
      },
      "vetur.experimental.templateInterpolationService": true,
      "vetur.validation.templateProps": true
    }
    ```

- 编辑器扩展

    - Vetur
    - [vue-helper](https://marketplace.visualstudio.com/items?itemName=shenjiaolong.vue-helper)
    - [uni-helper](https://marketplace.visualstudio.com/items?itemName=ModyQyW.vscode-uni-helper)

        - https://marketplace.visualstudio.com/items?itemName=ModyQyW.vscode-uni-app-snippets
        - https://marketplace.visualstudio.com/items?itemName=ModyQyW.vscode-uni-app-schemas
        - https://marketplace.visualstudio.com/items?itemName=ModyQyW.vscode-uni-ui-snippets

    - Auto Close Tag
    - Auto Rename Tag
    - Highlight Matching Tag
    - TODO Highlight
    - Todo Tree

- 编辑器代码块

    https://github.com/zhetengbiji/uniapp-snippets-vscode

- 语法提示

    - @dcloudio/types：`uni` 的 TypeScript 类型声明
    - @dcloudio/uni-helper-json：uni-app 基础组件的 vetur 数据配置


参考文献

- [开发uni-app，HBuilderX和其他工具(如vscode)有什么区别](https://ask.dcloud.net.cn/article/35451)
- [当 uni-app 遇见 vscode](https://ask.dcloud.net.cn/article/36286)
- [VSCode开发UNI-APP 配置教程、注意事项与插件推荐](https://blog.csdn.net/weixin_44670973/article/details/109221196)
