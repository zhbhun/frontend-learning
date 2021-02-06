# Visual Studio Code

[Dive Into Code: VSCode 源码阅读（一）](https://juejin.im/post/5ad94f9651882567161a1bfe)

## 配置

### [`jsconfig.json`](https://code.visualstudio.com/docs/languages/jsconfig)

- 如何支持 webpack alias

    ```json
    {
      "compilerOptions": {
        "baseUrl": "./",
        "paths": {
            "@/*": ["src/*"]
        }
      },
      "exclude": ["node_modules", "dist"]
    }
    ```
