- pixel
- percentage
- em
- rem

## 最小字体限制

Chrome 对特定的语言（汉语、日语、汉语等）限制了最小字体为 12px，早期可以通过 `text-size-adjust` 来解决，但现在已经废弃了，必须通过浏览器才能设置。

ps：Safari 和 Firefox 不存在该问题。

参考文献

- [Google Chrome: Minimum font-size Issue](https://www.fyianlai.com/2012/01/google-chrome-minimum-font-size-issue/)
- [Disable Chrome minimum font-size 10px](https://stackoverflow.com/questions/21302069/disable-chrome-minimum-font-size-10px)
- [The default setting of minimum font size may make layout of some pages broken](https://bugs.chromium.org/p/chromium/issues/detail?id=36429)
- [Font-size <12px doesn't have effect in Google Chrome](https://stackoverflow.com/questions/2295095/font-size-12px-doesnt-have-effect-in-google-chrome)
- [Remove Minimum font size setting or set to 0 as default ](https://github.com/brave/brave-browser/issues/5510)
- [变更集 145168 位于 webkit](https://trac.webkit.org/changeset/145168/webkit)
- [text-size-adjust](https://developer.mozilla.org/en-US/docs/Web/CSS/text-size-adjust)
- [-webkit-text-size-adjust的用法](https://juejin.cn/post/6960559693127221255)

## 移动端系统字体大小

缩放原理

- iOS：通过给 body 设置 -webkit-text-size-adjust 属性实现

    ```js
    alert(document.body.getAttribute('style')); // -webkit-text-size-adjust: 200%;
    ```

    ps：font-size、line-height 等被影响。

- Android：通过给 webview 设置字体的缩放来完成，具体的 API 是 `setTextZoom(int)`

    可以通过 getComputedStyle 获取缩放后的 font-size。

    ```js
    const ele = document.querySelector('.fs10'),null);
    ele.style.fontSize; // 代码设置的字体大小
    getComputedStyle(ele.getPropertyValue('font-size'); // 缩放后的字体大小
    ```

最佳实践：大部分 H5 只适配了屏幕大小，没有适配系统字体大小的调整。由于网页字体大小发生变化，而容器元素的大小没有变化，导致页面布局乱掉，导致文本不居中、文字折行、布局混乱等问题。

- 图文内容：不处理
- 复杂交互：屏蔽系统字体大小的调整。

    - iOS：通过 JS 获取 `-webkit-text-size-adjust` 的大小设置，在通过 rem 单位缩放回去。
    - Android：同上，只是计算比例的方式不一样。

        - Android 微信：可以借助WeixinJSBridge对象来阻止字体大小调整

            ```js
            (function() {
                if (typeof WeixinJSBridge == "object" && typeof WeixinJSBridge.invoke == "function") {
                    handleFontSize();
                } else {
                    document.addEventListener("WeixinJSBridgeReady", handleFontSize, false);
                }
                function handleFontSize() {
                    // 设置网页字体为默认大小
                    WeixinJSBridge.invoke('setFontSizeCallback', { 'fontSize' : 0 });
                    // 重写设置网页字体大小的事件
                    WeixinJSBridge.on('menu:setfont', function() {
                        WeixinJSBridge.invoke('setFontSizeCallback', { 'fontSize' : 0 });
                    });
                }
            })();
            ```

参考文献

- [移动端字体放大问题的研究](https://juejin.cn/post/6844903507061932040)
- [text-size-adjust](https://developer.mozilla.org/zh-CN/docs/Web/CSS/text-size-adjust)
- [-webkit-text-size-adjust使用汇总](https://www.jianshu.com/p/9fad261dd3e1)
- [开发移动端H5的时候，字体该不该随着手机系统字体的调整而变化？](https://segmentfault.com/q/1010000018737307)
