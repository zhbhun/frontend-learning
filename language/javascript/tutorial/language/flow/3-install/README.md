# 安装
1. `npm init`

    初始化项目

2. `npm install --save-dev flow-bin`

    安装 flow

3. `npm install --save-dev babel-cli babel-preset-env babel-preset-flow`

    - `babel-cli`：babel 命令行工具，用于运行 JavaScript 代码文件
    - `babel-preset-env`：ES 当前语法编译配置
    - `babel-preset-flow`：Flow 编译配置，使 babel 支持编译带有 flow 注解的 JavaScript 代码

3. `npm install --save-dev eslint babel-eslint eslint-plugin-flowtype`

    - `eslint`：代码检查工具
    - `babel-eslint`：使用 babel 作为 eslint 的编译器
    - `eslint-plugin-flowtype`：eslint 的 flow 插件，使 eslint 支持检查 flow 语法

# 配置
1. `touch .flowconfig`

    暂时不用配置

2. `touch .babelrc`

    ```json
    {
      "presets": [
        "env",
        "flow"
      ]
    }

    ```

3. `touch .eslintrc`

    ```json
    {
      "extends": [
        "eslint:recommended",
        "plugin:flowtype/recommended"
      ],
      "env": {
        "node": true
      },
      "plugins": [
        "flowtype"
      ]
    }
    ```

# 代码
**要检查的代码文件必须在文件顶部添加注释 `@flow`。**

# 检查
`npm run lint`

- 正常输出

    ```
    > eslint ./src && flow ./src && babel-node src

    No errors!
    Wah wah, I am Toby
    ```

- 错误输出

    ```
    > eslint ./src && flow ./src && babel-node src

    Error: src/index.js:8
      8: const toby = new Dog(123); // flow error
                              ^^^ number. This type is incompatible with the expected param type of
      6:   constructor(name: string) {
                             ^^^^^^ string. See: src/dog.js:6


    Found 1 error
    ```

# 运行
- `npm run test`
- `npm run build`

# 进阶
前面使用命令 `./node_modules/.bin/flow check` 来检查代码时，可以发现每次运行都要等一会才会出结果（即使代码没有变更，也是如此）。对此，flow 提供了后台服务器来加快重复检查速度。

- `flow`：首次执行时会在后台启动 flow 服务器并输出检查结果，后续再执行该命令直接显示检查结果
- `flow start`：在后台启动 flow 服务器，如果已经启动，则提示类似已经启动的相关信息
- `flow server`：在前台启动 flow 服务器，显示代码调整时的日志信息（不会显示代码检查结果，只包含一些统计信息）
- `flow stop`：关闭 flow 服务器
- `flow status`：同 `flow`

注意点：`flow server` 虽然在前台启动服务器，并且在代码调整时能实时输出一些日志信息，但并不会输出代码检查错误信息。要查看当前的代码检查结果，还是需要手动运行 `flow` 或 `flow status`。

# 其他
运行 `./node_modules/.bin/flow --help` 可以查看更多 flow 用法。
