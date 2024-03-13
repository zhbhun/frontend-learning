# 问题
Babel 编译后的代码要实现高级语法同样的功能需要借助一些工具函数，默认编译会在每个模块顶部添加这些工具函数，多个模块的话会在编译代码里重复出现这些工具函数代码。

源代码 **./src/index.js**

```javascript
const obj = {
  ['name']: 'JavaScript',
};

module.exports = obj;
```

编译代码 **./lib/index.js**

```javascript
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var obj = _defineProperty({}, 'name', 'JavaScript');

module.exports = obj;
```

如上所示 `_defineProperty` 就是一个工具函数，这个函数代码可能在多个编译文件里重复出现。

# 解决
babel-plugin-external-helpers 可以告诉 Babel 不在每个模块顶部生成这些工具函数，而是共同引用外部的工具函数。具体用法如下所示：

1. 生成外部工具函数

   `npm install babel-cli --save-dev`：安装 babel-cli 后，会在 node_modules/.bin 目录下添加命令 `babel-external-helpers`；
   
   `./node_modules/.bin/babel-external-helpers > helpers.js`：生成 helpers.js，该文件包含 babel 编译代码中使用到的所有工具函数；

   默认 helpers.js 适用于 node，helpers.js 会向 global 添加变量 `babelHelpers`。如果要用于浏览器可以添加命令选项 `-t var`，即 `./node_modules/.bin/babel-external-helpers -t var > helpers.js`，helpers.js 会直接使用 var 声明 `babelHelpers` 变量。

2. 配置 `.babelrc`

    `npm install babel-plugin-external-helpers --save-dev`
    
    添加插件 `external-helpers` 至 `.babelrc`

    ```
    {
      "plugins": ["external-helpers"]
    }
    ```

3. 编译

    略，生成的编译文件里的工具函数使用 `babelHelpers.xxx` 这种方式调用，这个 `babelHelpers` 就是第一步中生成的。

4. 使用

    - node

        ```
        require('./your-path-to/helpers.js');
        require('./your-path-to/yout-complied-file.js');
        ```

    - browser

        ```html
        <script type="application/javascript" src="your-path-to/helpers.js"></script>
        <script type="application/javascript" src="your-path-to/yout-compiled-file.js"></script>
        ```

# 示例
**package.json**

```
{
  "name": "babel-external-helpers",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "build": "babel ./src -d ./lib",
    "build-helpers": "cross-env NODE_ENV=helpers babel ./src -d ./helpers && babel-external-helpers > ./helpers/helpers.js"
  },
  "author": "zhbhun",
  "license": "ISC",
  "devDependencies": {
    "babel-cli": "^6.18.0",
    "babel-plugin-external-helpers": "^6.18.0",
    "babel-preset-es2015": "^6.18.0",
    "cross-env": "^3.1.3"
  }
}
```

**.babelrc**

```
{
  "presets": ["es2015"],
  "env": {
    "helpers": {
      "plugins": ["external-helpers"]
    }
  }
}
```

**./src/index.js**

```javascript
const obj = {
  ['name']: 'JavaScript',
};
```

**./lib/index.js**

```javascript
'use strict';

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var obj = _defineProperty({}, 'name', 'JavaScript');

module.exports = obj;
```

**./helpers/index.js**

```javascript
'use strict';

var obj = babelHelpers.defineProperty({}, 'name', 'JavaScript');

module.exports = obj;
```

**./helpers/helpers.js**

略

**./helpers/test.js**

```javascript
require('./helpers');
console.log(require('./index'));
```

运行示例

1. 编译

    - `npm run build`：正常编译
    - `npm run build-helps`：使用了插件 babel-plugin-external-helpers 的编译方式

2. 运行

    - `node ./lib/index.js`
    - `node ./helper/test.js`

# 总结
babel-plugin-external-helpers 的作用就是替换编译文件中重复出现的工具函数代码为公共模块的调用。

# 参考
- [External helpers](http://babeljs.io/docs/plugins/external-helpers/)
