@babel/preset-env 默认只 polyfill 稳定的 ECMAScript 特性。如果需要支持还处于审核阶段的新特性，那么需要做一些额外的设置。

1. `useBuiltIns: "entry"`

    需要手动引入相应的提案特性，例如：`import "core-js/proposals/string-replace-all"`

2. `useBuiltIns: "usage"`

    - 设置 `shippedProposals` 为 `true`：只会 polyfill 和转换已经被最新版本浏览器支持了一段时间的提案特性
    - 设置 `corejs: { version: 3, proposals: true`：会 polyfill core-js 支持的每一个提案特性

ps：关于现阶段哪些特性处于提案阶段且被 core-js 支持，可以查看 core-js 的源代码目录 [proposals](https://github.com/zloirock/core-js/tree/master/packages/core-js/proposals)。
