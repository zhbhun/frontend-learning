# [webcomponent](https://developer.mozilla.org/en-US/docs/Web/Web_Components)

## 基础

- [Web Components Tutorial for Beginners](https://www.robinwieruch.de/web-components-tutorial/)
- [Web Components](http://javascript.ruanyifeng.com/htmlapi/webcomponents.html)
- [Web Components 入门实例教程](https://www.ruanyifeng.com/blog/2019/08/web_components.html)
- [Web Components - 面向未来的组件标准](http://fex.baidu.com/blog/2014/05/web-components-future-oriented/)
- [《Web Component 实战》翻译规范](https://zhuanlan.zhihu.com/p/20312275)
- [A Guide to Web Components](https://css-tricks.com/modular-future-web-components/)
- [Google Web Components](https://developers.google.com/web/fundamentals/web-components)

    - [Custom Element Best Practices](https://developers.google.com/web/fundamentals/web-components/best-practices#aim-to-keep-primitive-data-attributes-and-properties-in-sync,-reflecting-from-property-to-attribute,-and-vice-versa.)
    - [Custom Elements v1 - Reusable Web Components](https://web.dev/custom-elements-v1/)

- [Introduce CSS Module Script](https://github.com/whatwg/html/pull/4898/)

### 自定义元素

- 创建自定义元素

```html
<user-card></user-card>
<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();
    }
  }
  window.customElements.define('user-card', UserCard);
</script>
```

ps：自定义网页元素的标签名必须含有连字符（-），一个或多个都可。这是因为浏览器内置的的HTML元素标签名，都不含有连字符，这样可以做到有效区分。

### 元素内容

```html
<user-card></user-card>
<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();

      this.innerHTML = '...';
    }
  }
  window.customElements.define('user-card', UserCard);
</script>
```

### 元素模板

```html
<user-card></user-card>
<template id="userCardTemplate">
  <style>
    :host {
      color: red;
    }
  </style>
  ...
</template>
<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();

      const templateElem = document.getElementById("userCardTemplate");
      const content = templateElem.content.cloneNode(true);
      this.appendChild(content);
    }
  }
  window.customElements.define('user-card', UserCard);
</script>
```

### 元素传参

```html
<user-card text="..."></user-card>
<template id="userCardTemplate">
  <style>
    :host {
      color: red;
    }
  </style>
</template>
<script>
  class UserCard extends HTMLElement {
    constructor() {
      super();

      const templateElem = document.getElementById("userCardTemplate");
      const content = templateElem.content.cloneNode(true);
      content.innerHTML = this.getAttribute("text");
      this.appendChild(content);
    }
  }
  window.customElements.define('user-card', UserCard);
</script>
```

### Shadow DOM

所谓Shadow DOM指的是，浏览器将模板、样式表、属性、JavaScript代码等，封装成一个独立的DOM元素。外部的设置无法影响到其内部，而内部的设置也不会影响到外部，与浏览器处理原生网页元素（比如 `<video>` 元素）的方式很像。

## 进阶

### 检测兼容性

- 检测是否支持模板 

    ```js
    function supportsTemplate() {
      return 'content' in document.createElement('template');
    }
    ```


## 开发框架

- [Custom Elements Everywhere](https://custom-elements-everywhere.com/)
- [component-register](https://github.com/ryansolid/component-register) - A simple library wrapper for Web Components
- https://webcomponents.dev/

## 项目示例

- [web-components-todo](https://github.com/shprink/web-components-todo) / https://wc-todo.firebaseapp.com/
