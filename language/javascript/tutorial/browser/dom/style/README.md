    
## API

- [`StyleSheetList`](https://developer.mozilla.org/en-US/docs/Web/API/StyleSheetList)：CSSStyleSheet 列表对象（类数组对象，但无法调用 Array 上的方法）

    通过 [`document.styleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/styleSheets) 获取。

- [`StyleSheet`](https://developer.mozilla.org/en-US/docs/Web/API/StyleSheet)：接口表示一个单一的CSS样式表，通常对应一个 style 标签和样式 link。

    不直接实例化使用，会有特定的子类实现，例如 CSSStyleSheet。

- [`CSSStyleSheet`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet)：CSSStyleSheet 接口表示一个单一的 CSS 样式表，它从它的父类 StyleSheet 继承了属性和方法，并且可以通过属性 `CSSStyleSheet.cssRules` 访问包含的所有样式(CSSRuleList)，以及通过 `deleteRule()`、`insertRule()` 和 `replace()` 等方法修改样式。

    通过访问或遍历 [`document.styleSheets`](https://developer.mozilla.org/en-US/docs/Web/API/Document/styleSheets) 获取，例如：`document.styleSheets[0]`。

- [`CSSRuleList`](https://developer.mozilla.org/en-US/docs/Web/API/CSSRuleList)：一个 CSSRuleList 表示一个只读的 CSSRule 对象的有序集合。

    通过 [`document.styleSheets[0].cssRules`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/cssRules) 获取。

- [`CSSRule`](https://developer.mozilla.org/en-US/docs/Web/API/CSSRule)：CSSRule 接口表示一个单一的 CSS 规则（比如某个选择器加上对应的样式）。

    有许多特点子类实现，可以用过 [`document.styleSheets[0].cssRules[0]`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleSheet/cssRules) 获取。

- [`CSSStyleDeclaration`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration)：SSStyleDeclaration 接口代表了一个作为 CSS 声明块的对象，并暴露了样式信息和各种与样式有关的方法和属性。

    获取方式：

    - [`HTMLElement.style`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style)
    - [`document.styleSheets[0].cssRules[0].style`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleRule/style)
    - [`Window.getComputedStyle()`](https://developer.mozilla.org/en-US/docs/Web/API/CSSStyleDeclaration)：返回的是属性只读对象

## 获取



    只读属性，返回当前网页的的所有样式表（[StyleSheetList](https://developer.mozilla.org/en-US/docs/Web/API/StyleSheetList)）。

- [`document.createElement('style').sheet`]

    返回 CSSStyleSheet 对象，代表单个 style 标签对应的样式。

- 【
