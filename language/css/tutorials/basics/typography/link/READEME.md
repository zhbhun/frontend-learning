# link
TODO

# @import
**@import 的用法**

- `@import <url> <media_query_list>`
- `<media_query_list>：[<media_query>[',' <media_query>]*]?`
- `<media_query>：[only | not]? <media_type> [and <expression>]* | <expression> [and <expression>]*`
- `<expression>：'('<media_feature>[:<value>]?')'`

示例

- 不同的 url

    ```css
    @import url("global.css");
    @import url(global.css);
    @import "global.css";
    ```

- 媒体类型

    `@import url("style.css") screen, print;`

- 媒体查询

    ```css
    @import url(example.css) screen and (min-width:800px);
    @import url(example.css) screen and (width:800px),(color);
    @import url(example.css) screen and (min-device-width:500px) and (max-device-width:1024px);
    ```


**@import 的使用注意点**

1. 该规则必须在样式表头部最先声明，并且其后的分号是必需的，如果省略了此分号，外部样式表将无法正确导入，并会生成错误信息；
2. IE使用 @import 无法引入超过 35 条的样式表；
3. 使用 url(url) 和直接使用 url 需要注意的地方：当使用 url(url) 的方式时，包住路径的引号可有可无；当直接使用 url 时，包住路径的引号必须保留；

**@import 的兼容性**

- 基础：IE6+
- 媒体类型：IE8+
- 媒体查询：IE9+

参考 http://css.doyoe.com/rules/@import.htm

# link VS @import
1. link 属于 HTML 标签，除了加载 CSS 外，还能用于定义 RSS, 定义 rel 连接属性等作用。而 @import 是 CSS 提供的，只能用于加载 CSS;
2. 页面被加载的时，link 会同时被加载，而 @import 引用的 CSS 会等到页面被加载完再加载；

    参考示例 [link-vs-@import](./link-vs-@import)

3. import 是 CSS2.1 提出的，只在 IE6 及以上版本才能被识别，而 link 是 HTML 标签，无兼容问题；

# 实际应用
只是用 link，禁止使用 @import

# 常见问题
...
