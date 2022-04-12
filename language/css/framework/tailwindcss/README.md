# [TailwindCSS](https://github.com/tailwindlabs/tailwindcss)

## 对比

误区

- 这和行内 CSS 有何区别，不就少写几个字吗？

    见下文的优点。

- 因为 CSS 类选择器变多，HTML 体积变大

    大多 CSS 类型选择器都是重复的，HTML 经过 gzip 压缩后，基本不怎么影响，反而可以减少 CSS 体积。

- 造成新的记忆负担？

    在 Vue 的 template 语法中也经常出现此类问题，很多人会对一些命名上的约定，特别是自己不太喜欢的约定天然排斥，这也无可厚非。实际上，在适应后反而减少了 CSS 选择器命名和 HTML 的关联维护，可以提高开发速度，降低维护成本。

优点

- 方便性：一些比较复杂的样式属性使用 class 可以快速方便的设置，例如：grid-cols-3

    ```css
    .grid-cols-3 {
       grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    ```

- 语义化：text-lg、text-white、ring、animate-spin

    如果给行内样式或 class 样式设置具体的值，维护的时候开发者无法不确定该样式在上下文中对应的语义，例如：文字大小可以分为很小、小、正常、大和很大，文字颜色可以分为主色，二级色和候选色等。而通过原子样式类，可以标记出该样式的含义，例如 text-lg 表示一个较大字号的文本，通常代表标题。
    
    ps：很多 UI 库可以通过 CSS 变量或预处理器变量来实现）

- 约束性：bg-gray-500、text-lg、p-4

    通过原子类的语义约束，可以避免页面上几十种参差不同的字体大小、文本颜色等。

    ps：但国内很多公司的 UI 没有统一的设计规范，约束反而可能影响开发效率

- 响应式：

    ```html
    <div class="container">
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
      <div class="item"></div>
    </div>
    ```

    使用 TailwindCSS 前

    ```css
    @media (min-width: 1024px) {
      .container {
          grid-template-columns: repeat(3,minmax(0,1fr));
      }
    }
    @media (min-width: 768px) {
      .container {
          grid-template-columns: repeat(2,minmax(0,1fr));
      }
    }
    .conainer {
      display: grid;
      gap: 1rem;
    }
    ```

    使用 TailwindCSS 后台

    ```html
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"></div>
    ```

- 修饰符：支持各种伪类、暗黑模式、响应式设计前缀设计
- 维护性：使用 bem 等命名方式的项目，因不同的开发水平和命名风格会产生各种各样的屎山代码，特别是没有用好 bem，全程使用嵌套选择的代码，后续在维护 HTML 和 CSS 选择器的关系变得特别复杂。
- 代码体积小：减少了重复样式的 CSS 代码，虽然 HTML 会因为元子类选择器会增大，但开 gzip 压缩后（字符重复的越高，压缩率控件越大），影响不大

缺点

- 不支持复杂选择器：

    例如当父级元素鼠标悬浮时的，子级元素的样式控制
    
    `.container:hover .item {}`

- 不支持 CSS 函数：calc

    ```css
    .body {
      height: calc(100vh - 6rem)
    }
    ```

- 多种属性复用

    ```css
    .item {
      @apply p-2 border-b flex justify-between font-mono;
    }
    ```

- PurgeCSS 有可能过多删除 class
- 样式覆盖问题：以下 red 与 blue 两个样式哪个会生效？无法确定。

    `<div class="red blue"> </div>`
参考文献

- [如何评价CSS框架TailwindCSS？](https://www.zhihu.com/question/337939566)

## 基础

- [在 React 编程中, 我是如何用 tailwind 优化样式编写的?](https://juejin.cn/post/6937911432545566727)
- [小程序原子化CSS技术方案（Windi CSS](https://juejin.cn/post/7040409435826552846)
- [原子化css之windicss 初探](https://juejin.cn/post/7063061869526777870)

## 问题

### 样式覆盖问题

- [CSS class override utility for component composition.](https://github.com/tailwindlabs/tailwindcss/discussions/1446)
- [Conflicting className precedence rules](https://github.com/tailwindlabs/tailwindcss/issues/1010)

---

- [Automatically sorting your Tailwind CSS class names](https://dev.to/drnic/automatically-sorting-your-tailwind-css-class-names-4gej)
