
## 背景

CSS 存在的问题

- Global NameSpace & Isolation
- Dependencies & Non-deterministic Resolution
- Minification & Dead Code Elimination
- Share Constants

参考文献

- https://speakerdeck.com/vjeux/react-css-in-js / https://speakerdeck.com/vjeux/react-css-in-js-react-france-meetup
- [All You Need To Know About CSS-in-JS](https://hackernoon.com/all-you-need-to-know-about-css-in-js-984a72d48ebc)

## 框架

| 框架/特性 | Extract CSS File | Automatic Vendor Prefixing | Pseudo Classes | Media Queries | Styles As Object Literals |
| --- | --- | --- | --- | --- | --- |
| styled-components | x | ✓ | ✓ | ✓ | x |
| emotion | ✓ | ✓ | ✓ | ✓ | ✓ |
| linaria | ✓ | ✓ | ✓ | ✓ | ✓ |
| styled-jsx | ✓ | ✓ | ✓ | ✓ | x |
| jss | ✓ | ✓ | ✓ | ✓ | ✓ |

- [css-modules](https://github.com/css-modules/css-modules) - 16k ★, Documentation about css-modules

    - https://github.com/webpack-contrib/css-loader#modules

- [styled-components](https://github.com/styled-components/styled-components) - 37k ★, Visual primitives for the component age. Use the best bits of ES6 and CSS to style your apps without stress
- [emotion](https://github.com/emotion-js/emotion)  - 15k ★, CSS-in-JS library designed for high performance style composition
- [linaria](https://github.com/callstack/linaria) - 9k ★, Zero-runtime CSS in JS library
- [styled-jsx](https://github.com/vercel/styled-jsx) - 7k ★, Full CSS support for JSX without compromises 
- [polished](https://github.com/styled-components/) - 7k ★, A lightweight toolset for writing styles in JavaScript
- [vanilla-extract](https://github.com/vanilla-extract-css/vanilla-extract) - 6k ★, Zero-runtime Stylesheets-in-TypeScript
- [jss](https://github.com/cssinjs/jss) - 6k ★, JSS is an authoring tool for CSS which uses JavaScript as a host language.
- [griffel](https://github.com/microsoft/griffel) - 1k ★, CSS-in-JS with ahead-of-time compilation ⚡️

--- 

废弃的

- [radium](https://github.com/FormidableLabs/radium) - A toolchain for React component styling.
- [aphrodite](https://github.com/Khan/aphrodite) - Framework-agnostic CSS-in-JS with support for server-side rendering, browser prefixing, and minimum CSS generation
- [babel-plugin-react-css-modules](https://github.com/gajus/babel-plugin-react-css-modules) - Transforms styleName to className using compile time CSS module resolution.
- [react-css-modules](https://github.com/gajus/react-css-modules) - Seamless mapping of class names to CSS modules inside of React components.
- [glamor](https://github.com/threepointone/glamor) - inline css for react et al
- [styletron](https://github.com/rtsao/styletron) - Toolkit for component-oriented styling
- [fela](https://github.com/rofrischmann/fela) - State-Driven Styling in JavaScript

---

参考文献

- [React: CSS in JS techniques comparison.](https://github.com/MicheleBertoli/css-in-js)
- [CSS-IN-JS-Benchmarks](https://github.com/A-gambit/CSS-IN-JS-Benchmarks/blob/master/RESULT.md)
- [这些 CSS-in-JS 库，谁更适合你](https://zhuanlan.zhihu.com/p/129670569)

## 教程

- [React.js inline style best practices](https://stackoverflow.com/questions/26882177/react-js-inline-style-best-practices)
- [CSS in JavaScript: The future of component-based styling](https://medium.freecodecamp.com/css-in-javascript-the-future-of-component-based-styling-70b161a79a32) 
- [CSS in JS: The Good & Bad Parts (Slides)](https://www.youtube.com/watch?v=95M-2YzyTno)
- [Choosing a CSS in JS library](https://gist.github.com/troch/c27c6a8cc47b76755d848c6d1204fdaf#file-choosing-a-css-in-js-library-md)
- [Stop using CSS in JavaScript for web development](https://medium.com/@gajus/stop-using-css-in-javascript-for-web-development-fa32fb873dcc)
- [Comparing CSS in JS Libraries](https://x-team.com/blog/compare-cxs-jss-performance/)
- [what’s wrong with css-in-js?](http://bradfrost.com/blog/link/whats-wrong-with-css-in-js/)
- [CSS in JS: Benefits, Drawbacks, and Tooling](https://objectpartners.com/2017/11/03/css-in-js-benefits-drawbacks-and-tooling/)
- [Should I use CSS-in-JS?](https://reactarmory.com/answers/should-i-use-css-in-js)
- [What’s wrong with CSS-in-JS?](https://css-tricks.com/whats-wrong-with-css-in-js/)
- [精读《请停止 css-in-js 的行为》](https://zhuanlan.zhihu.com/p/26878157)
- [精读《css-in-js 杀鸡用牛刀》](https://zhuanlan.zhihu.com/p/30118092)
- [漫谈 CSS in JS](https://zhuanlan.zhihu.com/p/31622439)
- [css in js趋势有哪些比较明朗的方案？](https://www.zhihu.com/question/38388076/answer/76802538)
- [如何看待《React: CSS in JS》？ ](https://github.com/hax/hax.github.com/issues/22)
- [CSS in JS: The Argument Refined](https://medium.com/@steida/css-in-js-the-argument-refined-471c7eb83955)
- [CSS in JS: Style as a Function of State](https://medium.com/@rofrischmann/styles-as-functions-of-state-1885627a63f7#.6k6i4kdch)
- [CSS in JavaScript: The future of component-based styling](https://medium.freecodecamp.org/css-in-javascript-the-future-of-component-based-styling-70b161a79a32)
- [CSS in JavaScript with JSS and React](https://medium.com/jobsity/css-in-javascript-with-jss-and-react-54cdd2720222)
- [CSS-in-JS，向Web组件化再迈一大步](https://zhuanlan.zhihu.com/p/35282727)

## 问题

- 优点

    1. 无全局样式冲突：原生 css 因为没有模块化能力，天然容易导致全局样式污染，如果不是特意用 BEM 方式命名，想要避免冲突就只能借助 css-in-js 了。
    2. 与 js 代码合在一起：天然融合进 js 代码方便模块化管理，使 css 可以与某个局部模块绑定。（css-modules 也一样能做到，只是必须单独拆一个样式文件）
    3. 能将 js 变量应用到样式上：虽然 css 变量也能解决这个问题，但不如 css-in-js 那么直观，inline-style 也能解决这个问题，但会产生大量重复的局部样式，且这个优势 css-modules 做不到。

- 缺点

    - css-in-js 运行时解析的实现版本增加了运行时性能压力，尤其在 React18 调度机制模式下，存在无法解决的性能问题（运行时插入样式会导致 React 渲染暂停，浏览器解析一遍样式，渲染再继续，然后浏览器又解析一遍样式）。

        运行时解析，是 css-in-js 方案永远跨不过去的困境，即便对于编译时 css-in-js 方案来说，也免不了在渲染时做额外的逻辑执行拖慢渲染速度。当 React 重渲染组件时，需要重新解析样式定义，并序列化 className，当渲染非常频繁时会导致明显的性能瓶颈，而解决方法是把样式定义抽出来，但这样就损失了第三个优点，即无法读取 js 变量了（这样还不如使用 css module）。

        ps：不得不说 React 的渲染机制实在是太有问题了，如果换成 SolidJS 这个问题就好办了，因为运行时的样式代码仅会运行一次，组件重渲染也不会导致这段解析代码被重复执行，此时 css-in-js 在样式变化时再做一次精确样式更新，性能问题就可以被解决了。

    - 增加了包体积。相比原生或者 css-modules 方案来说，增加了运行时框架代码 8kb 左右。
    - 让 ReactDevTools 结构变得复杂，因为 css-in-js 会包裹额外的 React 组件层用来实现样式插入。
    - 多个不同（甚至是相同）版本的 css-in-js 库同时加载时可能导致错误。
    - 样式插入优先级无法自定义，这就导致产生样式覆盖时，业务对样式覆盖的优先级无法产生稳定的预期。
    
        ps：class 优先级由 header 定义顺序决定，而非 className 的字符顺序决定，而 header 定义顺序又由资源加载与 css-in-js 插入执行时机决定，导致业务几乎不可能有稳定的样式覆盖顺序。这里产生的问题就是业务代码不断增多的 !impprtant 定义。

    - 不同 React 版本的 SSR，css-in-js 需要适配不同的实现，这对框架作者不太友好。


参考文献

- [Why We're Breaking Up with CSS-in-JS](https://dev.to/srmagura/why-were-breaking-up-wiht-css-in-js-4g9b)

    - [Emotion 库维护者解释为什么 Spot 公司不再使用运行时 CSS-in-JS](https://www.infoq.cn/article/TUxYLuzuUFdsy1EQkTIm?utm_source=pocket_saves)
    - [精读《我们为何弃用 css-in-js》](https://github.com/ascoders/weekly/blob/master/%E5%89%8D%E6%B2%BF%E6%8A%80%E6%9C%AF/263.%E7%B2%BE%E8%AF%BB%E3%80%8A%E6%88%91%E4%BB%AC%E4%B8%BA%E4%BD%95%E5%BC%83%E7%94%A8%20css-in-js%E3%80%8B.md)

- [Real-world CSS vs. CSS-in-JS performance comparison](https://pustelto.com/blog/css-vs-css-in-js-perf/) / [[译]真实React项目中CSS与CSS-in-JS的性能比较](https://juejin.cn/post/6990667421950410766/)
- [CSS-in-JS：一个充满争议的技术方案](https://www.infoq.cn/article/95ojp6upti9vsyfsw2xz)
- [性能比较之后，我决定放弃 CSS-in-JS](https://jishuin.proginn.com/p/763bfbd692fd)

### 编译时 css-in-js 方案是出路吗?

理论上是出路，但限制了 css-in-js 的灵活性。从 vanilla-extract 等编译时 css-in-js 框架来看，确实解决了运行时 css-in-js 性能问题，但带来了更多语法限制，比如必须预先定义样式再使用：

``ts
import { style } from '@vanilla-extract/css'

const myStyle = style({
  display: 'flex',
  paddingTop: '3px'
})

const App = () => <div className={myStyle} />
```

编译时 css-in-js 想要做到通用性，只能提供一个 className，这样就不受任何框架和环境的限制了，但这样也限制了声明语法的灵活性，显然不可以用内联方式定义样式。

而且这种编译时的方案本质上和 css-modules 是一样的，背后都是定义了一些静态样式名，只是说这些样式问题以 .sass 定义还是 .ts 定义，如果用 .ts 定义，配合编译工具可以使代码原生 import 的更加舒服。

所以使用了编译时 css-in-js 方案，本质上还是抛弃了运行时 css-in-js，投向了变种的 css-modules 阵营。

