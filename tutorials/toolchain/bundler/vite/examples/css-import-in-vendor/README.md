问题

使用 pnpm 安装依赖时，如果第三方库的 less 文件里引入了另外一个第三方库的 less 文件，而且这个库安装时没有提升到 node_modules 根目录里。这是，less 的模块机制会找不到该第三方库的 less 文件，因为 less 无法按 commonjs 的规则加载，每次遇到第三方库时都是在 node_modules 下去找的，所以找不到

解决方案

1. 在项目声明对应第三方库的依赖，这样 less 就能在 node_modules 找到对应模块了
2. 使用 vite 的别名机制
