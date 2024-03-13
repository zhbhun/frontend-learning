配置详解
======

要点

- 知道 babel6 默认是不编译代码的；
- 知道 babel 编译规则设置方法 - 插件和预设，路径，顺序，选项等；
- 了解每个插件的作用和用法；
- 知道某个特性属于哪个标准或哪个阶段，该使用哪个插件 - 参考 [compat-table](http://kangax.github.io/compat-table/es6/) 和 [current TC39 proposals](https://github.com/tc39/proposals)；
- 知道如何针对开发环境和生产环境做不同的编译设置；

## 编译规则

Babel 是一个支持各种规范的通用编译器，配置起来也变得非常灵活。由于实际项目需求不同，需要支持的语法也不同，例如：项目 A 需要支持 React 和 ES2016，项目 B 只要支持 ES2015。因此，在默认情况下 Babel 什么都不做（编译前和编译后的代码一致），使用时需要根据实际项目交给开发者自己定制。

Babel 编译规则的设置是基于插件完成的，每一个语法规则都对应一个插件。在项目中，我们要针对支持的语法配置相应的一系列插件。例如，我们需要编译 ES2015 的箭头函数，就要配置插件 [es2015-arrow-functions](http://babeljs.io/docs/plugins/transform-es2015-arrow-functions/)。

虽然插件配置非常灵活，但是每个项目都要一个个配置插件，工作起来非常的繁琐。为此，Babel 提供了 Presets，其内置了一系列 babel 插件，例如：babel-preset-es2015，babel-preset-es2016，babel-preset-es2017 等。在使用的时候，只需要根据项目需要支持的语法级别，设置相应的 preset 就可以了。

用法：

```json
{
  "plugins": [],
  "presets": [],
}
```

- 路径

  在设置插件和预设时，可以使用包名，路径，缩写等方式配置，如下所示：

  - `"plugins": ["babel-plugin-myPlugin"]` / `"presets": ["babel-preset-myPreset"]`
  - `"plugins": ["./node_modules/asdf/plugin"]` / `"presets": ["./node_modules/asdf/preset"]`
  - `"plugins": ["myPlugin"]` / `"presets": ["myPreset"]`
  - `"presets": ["@org/babel-preset-name"]` / `"presets": ["@org/name"]`

- 顺序

  - 配置插件在预设插件之前执行
  - 插件执行顺序同插件设置顺序
  - 预设插件顺序与预设设置顺序相反

  ```
  "plugins": [
    "transform-decorators-legacy", // will run first
    "transform-class-properties" // will run second
  ]

  "presets": [
    "es2015", // will run third
    "react", // will run second
    "stage-2" // will run first
  ]
  ```

- 选项

  插件和预设都可以设置选项参数，只要将原先的字符串封装在数组中，并提供一个设置对象就可以了，例如：

  ```json
  {
    "plugins": [
      ["transform-async-to-module-method", {
        "module": "bluebird",
        "method": "coroutine"
      }]
    ],
    "presets": [
      ["es2015", { "loose": true, "modules": false }]
    ]
  }
  ```

总结：大多数项目使用 Babel 的内建预设就足够了，在预设的基础上，可以使用插件实现更细粒度的编译能力。

## 编译模块

可以使用下列选项来设置不需要编译的模块

- ignore
- only

## 环境设置

Babel 插件解决许多不同的问题，其中大多数是开发工具，可以帮助你调试代码或是与工具集成。但在生产环境中，我们不想开启这些工具。另外，也有大量的插件用于在生产环境中优化你的代码，这些插件我们也不需要用于开发环境。

为此，Babel 提供了 env 选项来覆盖普通设置，实现不同环境使用不同的配置，例如：


```json
 {
  "presets": ["es2015"],
  "plugins": [],
  "env": {
    "development": {
      "plugins": [...]
    },
    "production": {
      "plugins": [...]
    }
  }
}
```

Babel 使用 `process.env.BABEL_ENV` 或 `process.env.NODE_ENV` （优先读取 `BABEL_ENV`，其次 `NODE_ENV`，都没有的话，默认 `development`） 来判断当前所处的环境，相应地开启 env 下的配置。

备注：`process.env.BABEL_ENV` 和 `process.env.NODE_ENV` 是从系统环境变量中读取的。 

- Unix：`BABEL_ENV=production [COMMAND]` / `NODE_ENV=production [COMMAND]`
- Window：

    ```
    $ SET BABEL_ENV=production
    $ [COMMAND]
    ```

- 跨平台：[cross-env](https://www.npmjs.com/package/cross-env)

## 其他设置

参考 http://babeljs.io/docs/usage/options/#options

- babelrc：是否使用 .babelrc 和 .babelignore 文件，默认 `true`；
- ast：返回对象包含 AST，默认 `true`；
- compact：不包含多余的空白字符，默认 `"auto"`
- minified：是否压缩输出，默认 `false`；
- extends：指向继承的 `.babelrc` 文件，默认为 `null`；
- ...

## 参考文献

- [Configure Babel](https://babeljs.io/docs/en/configuration)
- [Config Files](https://babeljs.io/docs/en/config-files)
- [Options](https://babeljs.io/docs/en/options/)
