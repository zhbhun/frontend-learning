## 标签

### 语义化

语义化的好处

- 可以提升可访问性与互操作性（兼容性会更好）；
- 改进搜索引擎的优化；
- 一般来说可以让HTML文件更小；
- 让代码更好唯护，与CSS3的关系更和谐。

语义化 VS DIV+CSS

TODO

语义化标签

- nav：导航
- article：文章
- section：区块
- aside：侧栏
- header：头部
- footer：页脚
- address
- figure
- time
- strong | b
- em | i
- progress
- meter


Reference

- [深入理解HTML5标签](https://segmentfault.com/a/1190000002695791)
- [如何写出高效率的HTML](https://segmentfault.com/a/1190000002680822)

### DOCTYPE

TODO

### Head

- meta

    - 描述网页信息

        - name="author"
        - name="copyright"
        - name="keywords"
        - name="description"
        - name="generator"
        - name="application-name"

    - 控制显示

        - name="vewiport"
        - name="renderer"
        - http-equiv="X-UA-Compatible"

    - 搜索引擎爬虫

        - name="robos"
        - name="revisit-after"

    - HTTP 响应头

        - charset=""
        - [http-equiv](http://reference.sitepoint.com/html/meta/http-equiv)：一般不用

    - 扩展

        - Baidu：mobile-agent, baiduspider
        - Twitter: twitter:card, twitter:image, twitter:creator:id
        - Google: application-url, google-site-verification, googlebot
        - Facebook：[Open Graph](https://developers.facebook.com/docs/opengraph)
        - 360: renderer (未注册)
    
    - [HTML meta 详解](https://segmentfault.com/a/1190000009705754)
    - [Meta Tag Builder - 100% Free!](http://www.scrubtheweb.com/abs/builder.html)

- link
- script
- title

### Data

- [what are data-* HTML attributes?](https://stackoverflow.com/questions/30417852/what-are-data-html-attributes)
- [How You Can Use HTML5 Custom Data Attributes and Why](https://www.sitepoint.com/how-why-use-html5-custom-data-attributes/)
- [What are data- attributes good for?](https://amyetheredge.com/interview/html/3.html)

### script

- [script async defer](https://segmentfault.com/q/1010000000640869)

### Image 的

- srcset

    - [srcset-polyfill](https://github.com/borismus/srcset-polyfill)
    - [image的srcset属性](https://segmentfault.com/a/1190000004254111)
    - [响应式图片srcset全新释义sizes属性w描述符](http://www.zhangxinxu.com/wordpress/2014/10/responsive-images-srcset-size-w-descriptor/)

## 常见问题

### 为什么最好把 CSS 的`<link>`标签放在`<head></head>`之间？为什么最好把 JS 的`<script>`标签恰好放在`</body>`之前，有例外情况吗？

- 把`<link>`放在`<head>`中

    > 把`<link>`标签放在`<head></head>`之间是规范要求的内容。此外，这种做法可以让页面逐步呈现，提高了用户体验。将样式表放在文档底部附近，会使许多浏览器（包括 Internet Explorer）不能逐步呈现页面。一些浏览器会阻止渲染，以避免在页面样式发生变化时，重新绘制页面中的元素。这种做法可以防止呈现给用户空白的页面或没有样式的内容。

- 把`<script>`标签恰好放在`</body>`之前

    > 脚本在下载和执行期间会阻止 HTML 解析。把`<script>`标签放在底部，保证 HTML 首先完成解析，将页面尽早呈现给用户。

## 模板语言

> 有过，比如 Pug （以前叫 Jade）、 ERB、 Slim、 Handlebars、 Jinja、 Liquid 等等。在我看来，这些模版语言大多是相似的，都提供了用于展示数据的内容替换和过滤器的功能。大部分模版引擎都支持自定义过滤器，以展示自定义格式的内容。

- [Top 10 Templating Engines for JavaScript To Improve and Simplify Your Workflow 2018](https://colorlib.com/wp/top-templating-engines-for-javascript/)

## 国际化

TODO


