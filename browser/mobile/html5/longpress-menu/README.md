长按弹出菜单
========

移动端的页面上长按某些类型的元素时，会弹出 webview 自带的菜单，例如：普通文本长按会弹出选择复制的菜单。

| 客户端/元素类型 | 普通文本 | 超链接 | 图片 |
| --- | --- | --- | --- |
| iOS 微信 | 选择复制 | 链接类型的弹出菜单（打开，拷贝等） | 图片类型的弹出菜单（发送，收藏，保存等） |
| android 微信 | 选择赋值 | 选择复制 | 图片类型的弹出菜单（发送，收藏，保存等） |

## 解决方案

### 禁止长按选择

```css
*:not(input):not(textarea) {
  user-select: none; /* 禁用复制 */
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
```

### 禁止长按菜单（文本，链接或图片）

```css
*:not(input):not(textarea) {
  user-select: none; /* 禁用复制 */
  -webkit-user-select: none;
  -khtml-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none; /* 禁止链接的长按弹出菜单 */
}
```

```javascript
// 通过事件来取消长按菜单的默认行为
window.oncontextmenu = (event) => {
  if (event.target && /^INPUT|TEXTAREA$/.test(event.target.nodeName)) {
    return true;
  }
  event.preventDefault();
  event.stopPropagation();
  return false;
};
```

ps：该方法不能禁用掉微信客户端图片的长按弹出菜单。


## 参考文献

- [Preventing default context menu on longpress / longclick in mobile Safari (iPad / iPhone)
](https://stackoverflow.com/questions/12304012/preventing-default-context-menu-on-longpress-longclick-in-mobile-safari-ipad)
- [Disabling the context menu on long taps on Android](https://stackoverflow.com/questions/3413683/disabling-the-context-menu-on-long-taps-on-android)
- [HTML5：在移动端禁用长按选中文本功能](https://juejin.im/post/5a39daa25188255de57de862)
- [移动端web如何禁止长按弹出的菜单？](https://segmentfault.com/q/1010000005088048)
