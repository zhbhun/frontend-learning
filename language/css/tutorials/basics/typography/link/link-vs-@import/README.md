# 示例分析
代码结构

- ./server - 服务器资源，提供阻塞指定时间的 CSS 和 JS
- ./test - 测试页面

    - import-import.html
    - link-import.html
    - link-with-import.html
    - link-block-import.html
    - many-import.html
    - link-link.html

- ./screenshort - 测试结果截图

代码分析

- @import @import - 使用 @import 引入两个样式表

    ```html
    <style>
      @import url('a.css');
      @import url('b.css');
    </style>
    ```

    要点：观察 a.css 和 b.css 是否并发下载

    总结：各个样式表并发下载，不会互相阻塞；

- link @import - 混合使用 link 和 @import

    ```html
    <link rel="stylesheet" href="a.css">
    <style>
      @import url('b.css');
    </style>
    ```

    要点：观察 a.css 和 b.css 是否并发下载

    总结：在 IE 下，@import 会等到 link 下载完才开始下载；

- link with @import - @import 放在 link 指定的样式表中

    ```html
    <link rel="stylesheet" href="index.css">
    ```

    ```css
    @import 'a.css';
    @import 'b.css';
    ```

    要点：观察 index.css，a.css 和 b.css 是否并发下载
    
    总结：所有浏览器都是要等待该样式表下载完，才开始下载 @import 样式表；

- link blocks @import - 同上，但是在之前还有其他的 link

    要点：观察 a.css，b.css 和 c.css 是否并发下载

    总结：在 IE 下，@import 会等待所有 link 下载完才开始下载，其他浏览器只要该 link 下载完就开始下载 @import 样式表；

- link link - 使用 link 引入两个样式表

    TODO

- many links - 使用 link 引入多个样式表

    TODO

运行示例

1. ./server -> `npm install`
2. ./server -> `npm start`
3. 在浏览器中打开 ./test 下的网页，使用浏览器开发工具观察资源下载顺序和时间

# 参考文献

- [don’t use @import](http://www.stevesouders.com/blog/2009/04/09/dont-use-import/)
- http://stevesouders.com/tests/atimport/import-import.php?t=1473749144 - 测试示例
- [Difference between @import and link in CSS](http://stackoverflow.com/questions/1022695/difference-between-import-and-link-in-css)
