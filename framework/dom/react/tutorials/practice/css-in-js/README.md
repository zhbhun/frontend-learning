
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

- [Real-world CSS vs. CSS-in-JS performance comparison](https://pustelto.com/blog/css-vs-css-in-js-perf/) / [[译]真实React项目中CSS与CSS-in-JS的性能比较](https://juejin.cn/post/6990667421950410766/)
- [CSS-in-JS：一个充满争议的技术方案](https://www.infoq.cn/article/95ojp6upti9vsyfsw2xz)
- [性能比较之后，我决定放弃 CSS-in-JS](https://jishuin.proginn.com/p/763bfbd692fd)



