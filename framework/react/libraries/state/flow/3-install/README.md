# 安装
1. `npm init`

    初始化项目

2. `npm install flow-bin --save-dev`

    安装 flow

3. `npm install babel-cli --save-dev` + `npm install babel-plugin-transform-flow-strip-types --save-dev`

    - `babel-cli`：babel 命令行工具，用于运行 JavaScript 代码文件
    - `babel-plugin-transform-flow-strip-types`：babel flow 插件，使 babel 支持编译带有 flow 注解的 JavaScript 代码

# 配置

1. `touch .flowconfig`

    暂时不用配置

2. `touch .babelrc`

    ```json
    {
      "plugins": [
        "transform-flow-strip-types"
      ]
    }
    ```

# 代码
- **要检查的代码文件必须在文件顶部添加注释 `@flow`。**
- 示例代码 `var str: number = 'hello world!';` 中的 `number` 是 flow 的类型注解，表示变量 str 的值必须是数字类型。
    
# 检查
`./node_modules/.bin/flow check`

输出日志：

```
index.js:3
3: var str: number = 'hello world!';
                    ^^^^^^^^^^^^^^ string. This type is incompatible with
3: var str: number = 'hello world!';
            ^^^^^^ number
Found 1 error
```

分析：由于示例代码中变量 str 的注解要求数字类型，但赋值给的是字符串，所以 flow 检查后可以发现该类型兼容问题。
  
# 运行
1. `./node_modules/.bin/babel-node index.js`

    **虽然示例代码存在类型错误，但 babel 仍然可以正确的编译执行代码（方便代码调试）。**

2. `/node_modules/.bin/babel index.js`

    编译源码，可以发现 babel 生成的代码里已经去掉了 flow 注解。

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
