滚动穿透
========

移动端当有 fixed 遮罩背景和弹出层时，在屏幕上滑动能够滑动背景下面的内容，这就是臭名昭著的滚动穿透问题。

## 解决方案

### 弹出层按压时取消默认行为

- 解决方案：在弹出层的 `touchstart` 事件中调用 `preventDefault`。
- 存在问题：

    1. 如果弹出层本身是有滚动（条）的话，将会导致弹出层无法滚动；
    2. 无法触发弹出层的点击回调事件。

- 测试示例：[question1-touchstart.html](./question1-touchstart.html)

### 弹出层滑动时取消默认行为

- 解决方案：在弹出层的 `touchmove` 事件中调用 `preventDefault`。
- 存在问题：解决了“按压时取消默认行为”的第二点问题，但第一点问题同样存在。
- 测试示例：[question1-touchmove.html](./question1-touchmove.html)

### body 标签禁止 overflow

- 解决方案：设置 `body{overflow:hidden;}`
- 存在问题：Chrome 模拟器上支持良好（支持弹出层内部滚动，又禁止了背景滚动且可以记住位置），但是 iOS 平台和Android 平台的非 Chrome 内核均不支持（背景仍然可以滚动）
- 测试示例：[question1-hidden-body.html](./question1-hidden-body.html)

### html 和 body 标签禁止 overflow

- 解决方案：设置 `html,body{overflow:hidden;}`
- 存在问题：

    1. 滚动位置丢失；
    2. iOS 存在弹性滚动，背景仍存在这个效果；
    3. 部分 Android App 的 webview 存在下拉刷新效果，在打开弹出框时仍然存在这个效果。

- 测试示例：[question1-hidden-html-body.html](./question1-hidden-html-body.html)

### fixed 定位 + 位置

- 解决方案：

    ```css
    body.dialog-open {
      position: fixed;
      width: 100%;
    }
    ```

    ```javascript
    (function(){
      var scrollTop = 0;
      open.onclick = function(){
        scrollTop = getScrollTop();
        document.body.classList.add('dialog-open'); 
        document.body.style.top = -scrollTop + 'px';
        mask.style.display = 'block';
      }  
      close.onclick = function(){
        mask.style.display = 'none';
        document.body.classList.remove('dialog-open');
        to(scrollTop);
      }
      function to(scrollTop){
        document.body.scrollTop = document.documentElement.scrollTop = scrollTop;
      }
      function getScrollTop(){
        return document.body.scrollTop || document.documentElement.scrollTop;
      }
    }());
    ```

- 存在问题：虽然解决了滚动位置丢失问题，但是仍然存在两个问题

    1. ios 和 Android 背景仍然存在弹性拖动效果；
    2. 通过绝对定位来记住位置可能会影响一些依赖滚动位置的功能，例如粘性定位。
    
- 测试示例：[question1-fixed.html](./question1-fixed.html)

### 内部滚动

- 解决方案：

    1. 设置 `html,body{height:100%;overflow:hidden;}`；
    2. 页面元素统一放在一个根节点下 `.page{height:100%;overflow:auto;-webkit-overflow-scrolling: touch;}`

- 存在问题：解决了通过脚本记住位置带来的第二点问题，但是 ios 和 Android 背景的弹性拖动问题仍然存在，并且如果是遗留的项目这样改动可能会带来其他问题。
- 测试示例：[question1-inner.html](./question1-inner.html)

### 弹出层非滚动区域禁止默认行为

- 解决方案：在弹出层监听 `touchmove` 事件，判断触发事件的元素是否是滚动区域的子元素，不是的话调用 `preventDefault`。
- 存在问题：滚动区域拖动到顶部或底部时，继续拖动时背景仍然可以滚动，虽然可以通过判断是否滚动到边界和拖动方向来决定是否调用 `preventDefault`，但是在 Android 平台上效果并不是很好（Android 上拖动过快时 `preventDefault` 不一定能起到作用，iOS 不存在该问题）。
- 测试示例：[question1-touchmove-scroll](./question1-touchmove-scroll.html)

## 最佳实践

- 如果弹出层不需要支持内部滚动，直接采用“弹出层滑动时取消默认行为”的解决方案；
- 如果弹出层需要支付内部滚动

    - webview 提供了关闭弹性拖动的接口：“内部滚动”或者“fixed定位 + 位置”的解决方案，在打开弹框时先关闭弹性拖动效果，关闭弹框时再恢复；
    - webview 没有提供关闭弹性拖动的接口：iOS 可以采用“弹出层非滚动区域禁止默认行为”的方案，Android 仍然采用“内部滚动”或者“fixed定位 + 位置”的解决方案。

## 开源项目

- [body-scroll-lock](https://github.com/willmcpo/body-scroll-lock)：吹的那么流弊，在移动端上没什么卵用

    - [Body scroll lock — making it work with everything](https://medium.com/jsdownunder/locking-body-scroll-for-all-devices-22def9615177)

## 参考文献

- [移动端滚动穿透问题完美解决方案](https://segmentfault.com/a/1190000005617307)
- [移动端滚动穿透解决方案](https://juejin.im/post/5abf1c69f265da239706fcb8)
- [移动端滚动穿透问题](https://github.com/pod4g/tool/wiki/%E7%A7%BB%E5%8A%A8%E7%AB%AF%E6%BB%9A%E5%8A%A8%E7%A9%BF%E9%80%8F%E9%97%AE%E9%A2%98)
- [iOS 10 Safari: Prevent scrolling behind a fixed overlay and maintain scroll position](https://stackoverflow.com/questions/41594997/ios-10-safari-prevent-scrolling-behind-a-fixed-overlay-and-maintain-scroll-posi)
