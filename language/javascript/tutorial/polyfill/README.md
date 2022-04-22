## 方案

- polyfill.io：根据浏览器 UA 自动下发需要的 polyfill

    - 优点：根据用户按需下载，且可以自定义需要的 polyfill
    - 缺点：依赖 polyfill.io 服务的稳定性，而且不同地区访问的下载速度也不一致。

        ps：可以考虑自建

- module/nomodule：通过 module 加载现代浏览器的 polyfill，通过 nomodule 加载旧浏览器的 polyfill，前者只需要支持 Chrome 61+, Firefox 60+, Safari 10.1+。

    ```html
    <!-- Full polyfill bundle for old browsers -->
    <script nomodule src="/polyfills/full.min.js"></script>

    <!-- Smaller polyfill bundle for browsers with ES2015+ support -->
    <script type="module" src="/polyfills/modern.min.js"></script>

    <!-- Bundle script. `defer` is required to execute
        this script after the `type="module"` one -->
    <script src="/bundle.min.js" defer></script>
    ```

    - 优点：新版浏览器下载的 polyfill 可以更小。
    - 缺点：

        - Safari 10.1 存在奇怪的 bug —— 只支持 module，而不支持 nomodule
        - module/nomodule 实际上只是节省了 ES5 和 ES2015+ browsers 之间的 polyfill 代码，兼容 ES2016 及以上的 polyfill 标准占据了大部分代码体积。
        - module script 必须以 defer 的形式加载，所以常规的脚本也得加上 defer，以确保 polyfill 先执行

- Babel’s useBuiltIns：根据要兼容的目标浏览器，按需编译引入需要的 polyfill。

    - 优点：容易配置，且自动处理。
    - 缺点：

        - 一般项目都不会使用 babel 处理 node_module 下的模块，可能导致问题
        - 在某些场景下，可能引入多余的 polyfill，如下所示的代码，babel 无法区分 myVar 是数组还是字符串，最终会引入 Array.prototype.includes 和 String.prototype.includes

            ```js
            import { myVar } from './myModule';
            myVar.includes();
            ```

## 参考

- [How to load polyfills only when needed](https://3perf.com/blog/polyfills/)
- [Deploying ES2015+ Code in Production Today](https://philipwalton.com/articles/deploying-es2015-code-in-production-today/)
