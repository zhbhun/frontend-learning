# [Declaration](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

## DefinitelyTyped

- https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.zh.md
- [[翻译] DefinitelyTyped 的自动化管理改造](https://juejin.cn/post/6977281038263255054)
- https://jkchao.github.io/typescript-book-chinese/typings/types.html#%E4%BD%BF%E7%94%A8-types

## 基础

...

## 问题

### 怎么查找第三方库的类型声明文件

https://www.typescriptlang.org/dt/search?search=

### Babel 7 + Typescript 怎么提取 d.ts 文件

tsconfig.types.json

```json
{
    "extends": "./tsconfig",
    "compilerOptions": {
        "outDir": "dist",
        "declaration": true,
        "declarationMap": true,
        "isolatedModules": false,
        "noEmit": false,
        "allowJs": false,
        "emitDeclarationOnly": true
    },
    "exclude": ["**/*.test.ts"]
}
```

```shell
$ cross-env NODE_ENV=production tsc --project tsconfig.types.json
```

参考

- [Babel 7 + Typescript - extracting declaration d.ts file on transpile](https://github.com/babel/babel/issues/9668)
- https://github.com/johnagan/clean-webpack-plugin/blob/2b94838bd140cbf9d6b6f5449de7d1e676ed87b2/package.json#L31-L33
