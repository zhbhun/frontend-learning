**新特性**

- HTML5 不再基于 SGML，文档类型声明使用 `<!DOCTYPE HTML>`；
- 语义化标签；
- 新增 API
- 无障碍；

**标签调整**

- 新的标签：section, video, progress, nav, meter, time, aside, canvas, command, datalist, details, embed, figcaption, figure, footer, header, hgroup, keygen, mark, output, rp, rt, ruby, source, summary, wbr；
- 调整的标签

    - input 元素的新类型：date, email, url，calendar，time，search；
    - 新的属性：

        - ping（用于a与area）；
        - charset（用于meta）；
        - async（用于script）；
        - autocomplete 适用于 `<form>`，以及下面的 `<input>` 类型：text, search, url, telephone, email, password, datepickers, range 以及 color；

            [HTML <input> autocomplete 属性](http://www.w3school.com.cn/tags/att_input_autocomplete.asp)

    - 全域属性：id, tabindex, repeat；
    - 新的全域属性：contenteditable, contextmenu, draggable, dropzone, hidden, spellcheck；

- 移除的标签

    - 纯表现的元素：basefont，big，center，font, s，strike，tt，u；
    - 对可用性产生负面影响的元素：frame，frameset，noframes；
    - 其他：acronym, applet, dir, isindex；

**新增 API**

- Geolocation
- Drag and Drop
- Local Storage
- Session Storage
- Application Cache
- Web Workers
- SSE
- Canvas/WebGL
- Audio/Video
- Canvas
- Webworker
- Websocket
- Page Visibility - 页面可见性
