# [Quill](https://quilljs.com/)

## 入门

### 配置

- formats：配置支持的内容格式，这个配置是和工具栏分离的，例如：可以实现复制黏贴加粗的文本，但工具栏不支持修改加粗。

    ps：参考 https://quilljs.com/docs/formats/

- modules：用来定制功能，例如：工具栏按钮，快捷键和剪贴板等。

    - toolbar：工具栏
    - keyboard：快捷键
    - history：历史
    - clipboard：剪贴板
    - syntax：语法

- theme：主题

### API

- content
- selection
- editor
- formatting
- model
- extension
- events

### Delta

Delta 是 Quill 描述富文本内容的一种 JSON 格式，content API 返回的对象都是 Delta。

## 进阶

### 格式定制

- [quill-magic-url](https://github.com/visualjerk/quill-magic-url) - Automatically convert URLs to links in Quill
- [quill-better-table](https://github.com/soccerloway/quill-better-table) - Module for better table in Quill, more useful features are supported.
- [quill-table-ui](https://github.com/volser/quill-table-ui) - A module for table UI in Quill

### 模块定制

- [quill-html-edit-button](https://github.com/benwinding/quill-html-edit-button) - About
Quill.js Module which allows you to quickly view/edit the HTML in the editor

### 文档转换

- [quill-delta-to-html](https://github.com/nozer/quill-delta-to-html) - Converts Quill's delta ops to HTML
- [node-quill-converter](https://github.com/randomwalklabsco/node-quill-converter) - Convert HTML to a Quill Delta or a Quill Delta to HTML
- [convert-rich-text](https://github.com/voxmedia/convert-rich-text) - Convert an insert-only rich-text delta into HTML
- [quill-to-pdf](https://github.com/andrewraygilbert/quill-to-pdf) - Turn the content of your QuillJS editor into a downloadable PDF document.
- [quill-to-word](https://github.com/andrewraygilbert/quill-to-word) - Generate a Word document from your QuillJS contents.
- [QuillJS Parser](https://github.com/andrewraygilbert/quilljs-parser#readme) - Parse a QuillJS delta.

### 框架集成

- [ng-quill](https://github.com/KillerCodeMonkey/ng-quill)
- [ngx-quill](https://github.com/KillerCodeMonkey/ngx-quill)
- [react-quill](https://github.com/zenoamaro/react-quill)
- [vue2-editor](https://github.com/davidroyer/vue2-editor)
- [vue-quill-editor](https://github.com/surmon-china/vue-quill-editor)
