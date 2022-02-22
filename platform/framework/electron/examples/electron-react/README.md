# 集成说明

1. 项目初始化

    ```shell
    npx create-react-app <name> --template typescript
    cd <name>
    npm i -D electron electron-is-dev concurrently wait-on electron-devtools-installer
    ```

2. 创建并配置 electron 启动文件

    - [`./electron/main.js`](./electron/main.js)
    - [`./package.json`](./package.json)：main 字段指向 `./electron/main.js`

3. 配置开发启动脚本：修改 `package.json` 的 scripts 脚本

    ```
    {
      "scripts": {
        "start": "concurrently -k \"BROWSER=none npm run start:react\" \"npm run start:electron\"",
        "start:react": "react-scripts start",
        "start:electron": "wait-on tcp:3000 && electron .",
      }
    }
    ```
