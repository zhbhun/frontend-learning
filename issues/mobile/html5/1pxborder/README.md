一像素显示
========

关于一像素显示的问题可以参考 [从1px像素问题剖析像素及viewport](https://zhuanlan.zhihu.com/p/30640770) 和 [iPhone 6 屏幕揭秘](http://wileam.com/iphone-6-screen-cn/)。

## 解决方案

如何解决一像素显示问题可以参考博客 [7种方法解决移动端Retina屏幕1px边框问题](https://www.jianshu.com/p/7e63f5a32636)。

| 方案/优缺点  | 兼容性 | 颜色 | 圆角 | 总结 |
| --- | --- | --- | --- | --- |
| 0.5px 边框 | 无法兼容安卓设备、 iOS 8 以下设备 | 支付 | 支持 | 简单，不需要过多代码 |
| 使用 border-image | 无 | 修改颜色麻烦，需要替换图片 | 圆角需要特殊处理，并且边缘会模糊 |可以设置单条,多条边框，且没有性能瓶颈的问题 |
| 使用background-image实现 | 无 | 修改颜色麻烦, 需要替换图片 | 圆角需要特殊处理，并且边缘会模糊 | 可以设置单条,多条边框，没有性能瓶颈的问题 |
| 多背景渐变实现 | 多背景图片有兼容性问题 | 支持 | 不支持 | 可以实现单条、多条边框，边框的颜色随意设置，但是代码量不少 |
| 使用 box-shadow 模拟边框 | 无 | 边框有阴影，颜色变浅 | 支持 | 代码里少，可以满足所有场景 |
| viewport + rem 实现 | 无 | 支持 | 支持 | 所有场景都能满足，一套代码，可以兼容基本所有布局，但是老项目修改代价过大，只适用于新项目 |
| 伪类 + transform 实现 | 无 | 支持 | 支持(伪类和本体类都需要加border-radius) | 所有场景都能满足，对于已经使用伪类的元素(例如clearfix)，可能需要多层嵌套 |

## 测试示例

- [一像素分割线](./divider.html)
- [一像素分割线（viewport）](./divider-viewport.html)
- [一像素边框](./border.html)
- [一像素边框（viewport）](./border-viewport.html)

## 最佳实践

如果公司内部已经有成熟的 “viewport + rem” 实现方案，那就不需要考虑一像素问题了。对于没有采用该方案的项目，可以结合 ”0.5px 边框“ 和 “伪类 + transform 实现” 的实现方案。

1. HTML 的 `header` 标签里加入 0.5 像素检测脚本（放在头部可避免屏幕出现闪烁问题）

    ```javascript
    var docEl = document.documentElement;
    var fakeBody = document.createElement('body');
    var testElement = document.createElement('div');
    testElement.style.border = '.5px solid transparent';
    fakeBody.appendChild(testElement);
    docEl.appendChild(fakeBody);
    if (testElement.offsetHeight === 1) {
      docEl.classList.add('hairlines');
    }
    docEl.removeChild(fakeBody);
    ```

2. 根据选择器 `.hairlines` 和设备像素比来设置预定义的公共样式

    ```css
    /* 分割线 */
    .line-bottom,
    .line-left,
    .line-right,
    .line-top {
      position: relative;
    }
    .line-top::before,
    .line-bottom::after {
      content: '';
      position: absolute;
      left: 0;
      height: 1px;
      width: 100%;
      background-color: #e8e8e8;
    }
    .line-left::before,
    .line-right::after {
      content: '';
      position: absolute;
      top: 0;
      width: 1px;
      height: 100%;
      background-color: #e8e8e8;
    }
    .line-top::before {
      top: 0;
    }
    .line-bottom::after {
      bottom: 0;
    }
    .line-left::before {
      left: 0;
    }
    .line-right::after {
      right: 0;
    }
    .hairlines .line-top::before,
    .hairlines .line-left::before,
    .hairlines .line-right::after,
    .hairlines .line-bottom::after {
      transform: none;
    }
    .hairlines .line-top::before,
    .hairlines .line-bottom::after{
      height: 0.5px;
    }
    .hairlines .line-left::before,
    .hairlines .line-right::after{
      width: 0.5px;
    }
    @media (-webkit-min-device-pixel-ratio: 2) {
      .line-top::before,
      .line-bottom::after {
        transform: scaleY(0.5);
      }
      .line-left::before,
      .line-right::after {
        transform: scaleX(0.5);
      }
    }
    /* 由于部分颜色比较淡，按实际比例缩放可能导致看不清分割线，所以可根据具体需求来决定是否按照实际像素比缩放 */
    /*@media (-webkit-min-device-pixel-ratio: 3) {
      .line-top::before,
      .line-bottom::after {
        transform: scaleY(0.333333);
      }
      .line-left::before,
      .line-right::after {
        transform: scaleX(0.333333);
      }
    } */
    /* 边框 */
    .border {
      position: relative;
    }
    .border::after {
      content: " ";
      position: absolute;
      top: 0;
      left: 0;
      border: 1px solid #e8e8e8;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
      transform-origin: left top;
    }
    .hairlines .border::after {
      display: none;
    }
    .hairlines .border {
      border: 0.5px solid #e8e8e8;
    }
    @media (-webkit-min-device-pixel-ratio: 2) {
      .border::after {
        width: 200%;
        height: 200%;
        transform: scale(0.5);
      }
    }
    /*@media (-webkit-min-device-pixel-ratio: 3) {
      .border::after {
        width: 300%;
        height: 300%;
        transform: scale(0.333333);
      }
    } */
    ```

[一像素显示-最佳实践](./practice.html)

## 参考文献

- [iPhone 6 屏幕揭秘](http://wileam.com/iphone-6-screen-cn/) / [iPhone 6 Screens Demystified](https://www.paintcodeapp.com/news/iphone-6-screens-demystified)
- [从1px像素问题剖析像素及viewport](https://zhuanlan.zhihu.com/p/30640770)
- [7种方法解决移动端Retina屏幕1px边框问题](https://www.jianshu.com/p/7e63f5a32636)
- [移动web 1像素边框 瞧瞧大公司是怎么做的](https://segmentfault.com/a/1190000007604842)
- [Retina屏的移动设备如何实现真正1px的线？](https://jinlong.github.io/2015/05/24/css-retina-hairlines/)
- [再谈mobile web retina 下 1px 边框解决方案](http://www.ghugo.com/css-retina-hairline/)
