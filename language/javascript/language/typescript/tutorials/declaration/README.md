# Declaration

## 常见问题

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
