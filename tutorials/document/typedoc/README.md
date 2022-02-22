# [TypeDoc](https://github.com/TypeStrong/typedoc)

## 入门

- 模块识别机制：entryPoints 配置的每个文件输入都会作为一个模块输出

    可以根据是否需要分模块组织接口文档来决定 entryPoints 的配置，单模块则配置一个入口文件，多模块可以结合 `@module` 对子模块进行命名。

    ps：如果使用目录作为输入的话，目录下的所有模块都会生成模块。

- 模块内的输出分类：通过 `@category` 标记对方法、类和接口等输出进行分类

## 进阶

### Markdown

- [typedoc-plugin-markdown](https://github.com/tgreyuk/typedoc-plugin-markdown)

## 参考文献

- [TypeScript 文档化工具: typedoc](https://www.xdnote.com/typedoc/)
- [Documenting Your TypeScript Projects: There Are Options](https://blog.bitsrc.io/documenting-your-typescript-projects-there-are-options-da7c8c4ec554)
- [Generating Documentation for TypeScript Projects](https://blog.cloudflare.com/generating-documentation-for-typescript-projects/)
