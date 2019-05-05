- 模块内部自动启用严格模式
- export

    用法

    - `export const xxx = 'value'`
    - `export function xxx() {}`
    - `export class xxx() {}`
    - `export { xxx }`
    - `export { xxx as yyy }`

    要点

    - 必须与模块内部的变量建议一一对象关系，如下所示是错误写法

        ```javascript
        export 1;
        var m = 1;
        export m;
        ```

    - export 语句输出的值是动态绑定的，其他模块可以获取到模块输出内部实时的值

        下面这个例子中的 foo 在 500 毫秒后被重新赋值，外部模块获取到的同样是新的值

        ```
        export var foo = 'bar';
        setTimeout(() => foo = 'baz', 500);
        ```

- import

    用法

    - `import xxx from './moduleName'`
    - `import { xxx } from './moduleName'`
    - `import xxx, { yyy } from './moduleName'`
    - `import * as xxx from './moduleName'`

## 参考文献

- http://es6.ruanyifeng.com/#docs/module
- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
