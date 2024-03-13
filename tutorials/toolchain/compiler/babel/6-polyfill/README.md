# 兼容性
参考 [babel-plugin-transform-runtime-definitions](https://github.com/babel/babel/blob/master/packages/babel-plugin-transform-runtime/src/definitions.js)

| feature | support | compatibility |
| --- | --- | --- |
| **builtins** | | |
| Symbol | √ | |
| Promise | √ | |
| Map | √ | |
| WeakMap | √ | |
| Set | √ | |
| WeakSet | √ | |
| Observable | √ | |
| setImmediate | √ | |
| clearImmediate | √ | |
| asap | √ | |
| **Methods** | | |
| Array.isArray | X | |
| Object.assign | √ | |
| Object.create | √ | |
| Object.defineProperties | √ | |
| Object.defineProperty | X | |
| Object.entries | √ | |
| Object.freeze | √ | |
| Object.getOwnPropertyDescriptor | √ | |
| Object.getOwnPropertyDescriptors | √ | |
| Object.getOwnPropertyNames | √ | |
| Object.getOwnPropertySymbols | √ | |
| Object.getPrototypeOf | √ | |
| Object.isExtensible | √ | |
| Object.isFrozen | √ | |
| Object.isSealed | √ | |
| Object.is | √ | |
| Object.keys | √ | |
| Object.preventExtensions | √ | |
| Object.seal | √ | |
| Object.setPrototypeOf | √ | |
| Object.values | √ | |


# 实际应用

- 在客户端利用浏览器标识 "UA" 来识别浏览器，再请求特定的 polyfill

    - 优点：可以根据浏览器类型和版本，只加载需要的 polyfill
    - 缺点："UA" 识别不一定准确，并且需要使用脚本执行来请求具体的 polyfill，影响浏览器的预加载功能

- 在服务端利用请求头的 "UA" 来识别浏览器，在渲染带有特定 polyfill 的 HTML

    - 优点：具有客户端识别的优点的同时，而不会影响浏览器的预加载
    - 缺点：”UA“ 识别不一定准确

- 使用 babel-polyfill

    - 优点：一劳永逸，解决所有的兼容性问题
    - 缺点：增加了脚本文件大小，全部 polyfill 压缩前 80KB 左右，压缩后 30KB 左右

- 使用 babel-runtime

    - 优点：按需加载 polyfill，这里的按需指的是根据应用程序代码来加载可能用到的 polyfill，而不是根据浏览器
    - 缺点
    
        - 无法提供第三方库需要的 polyfill？
        - 无法解决实例方法缺失的问题，例如 `''.includes()`

相关讨论

- 疑问

    - [Use some parts of babel polyfill](http://stackoverflow.com/questions/33858059/use-some-parts-of-babel-polyfill)
    - [how can I use babel polyfill to support all IE11 issues with gulp](http://stackoverflow.com/questions/36264993/how-can-i-use-babel-polyfill-to-support-all-ie11-issues-with-gulp/36290922)
    - [Facebook iOS app browser not supported](https://github.com/Financial-Times/polyfill-service/issues/561)

- 讨论

    - [How ‘smart’ is babel-polyfill? Supporting older browsers](http://discuss.babeljs.io/t/how-smart-is-babel-polyfill-supporting-older-browsers/230)
    - [Polyfill](https://github.com/facebookincubator/create-react-app/issues/170)
    - [Document the extent of ES6 polyfilling](https://github.com/facebookincubator/create-react-app/issues/969)
    - [Add Promise and fetch polyfills](https://github.com/facebookincubator/create-react-app/pull/235)
    - [Support async/await](https://github.com/facebookincubator/create-react-app/issues/51)
    - [Add polyfill from polyfill.io](https://github.com/facebookincubator/create-react-app/pull/174)
    - [Is there a option to build a ES5 React App? ]https://github.com/facebookincubator/create-react-app/issues/914
    - [ES2016 feature Array.includes is not transpiled](https://github.com/facebookincubator/create-react-app/issues/942)

- 方案

    - https://polyfill.io/v2/docs/
    - [Support Babel-compiled code](https://github.com/Financial-Times/polyfill-service/issues/373)

# 参考文献

- [ES6 + Webpack + React + Babel 如何在低版本浏览器上愉快的玩耍(上)](https://yq.aliyun.com/articles/59107?spm=5176.100239.blogcont60724.33.QS1gLa)
- [ES6 + Webpack + React + Babel 如何在低版本浏览器上愉快的玩耍(下)](https://yq.aliyun.com/articles/60724)
- [export syntex parse fail ](https://github.com/babel/babel-loader/issues/195?spm=5176.100239.blogcont60724.14.QS1gLa)
- [Latest babel-polyfill (since 6.6.0) breaks IE8 /w Object.defineProperty (T7206)](https://github.com/babel/babel/issues/4174)
- https://github.com/babel/babel/blob/9969224a93956fa29d1dde61a720d1727f212603/packages/babel-plugin-transform-runtime/src/index.js#L87
- [how to use javascript Object.defineProperty](http://stackoverflow.com/questions/18524652/how-to-use-javascript-object-defineproperty)

# TODO
## 浏览器常见兼容性错误整理

- `缺少标识符、字符串或数字`

    IE8 不支持关键字属性字面量，必须使用字符串代替。

    解决：开启 babel 插件 `babel-plugin-transform-es3-member-expression-literals`

- `缺少标识符`

    IE8 不支持关键字成员字面量，必须使用 `[string]` 代替

    解决：开启 babel 插件 `babel-plugin-transform-es3-property-literals`

- `对象不支持“create”属性或方法`

    IE8 不支持 ES5 的一些全局对象静态方法

- `对象不支持“forEach”属性或方法`

    IE8 不支持 ES5 的一些实例对象方法

- ...

## Polyfill 对打包文件大小的影响
- [How much overhead does ES2015 bring on the client?](https://forums.meteor.com/t/how-much-overhead-does-es2015-bring-on-the-client/7774)
- [How much does ECMAScript 2015 cost?](http://info.meteor.com/blog/how-much-does-es2015-cost)
- [Babel-polyfill file-size, using in webpack ](https://github.com/babel/babel-loader/issues/163)
- https://twitter.com/dan_abramov/status/656577654070640645
- [Use some parts of babel polyfill](http://stackoverflow.com/questions/33858059/use-some-parts-of-babel-polyfill)
- [is anyone using ES6 in a large project? How's it going? Any hurdles?](https://www.reddit.com/r/javascript/comments/332v73/is_anyone_using_es6_in_a_large_project_hows_it/)

