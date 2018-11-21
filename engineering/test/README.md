测试
========

## 测试范围

- 单元测试：测试逻辑性强的代码
- 界面测试：测试界面是否正常
- 功能测试：测试功能操作是否正常，利用测试运行器来模拟用户操作
- 性能测试
- 兼容性测试

> 测试金字塔，单元测试 -> 服务测试 -> UI 测试

## 测试原则

1. 针对网站核心功能而不是所有功能来添加case
2. ...

## 测试方案

- 单元测试：测试框架 + 断言库

    - mocha + chai

- 界面测试：常见的做法有像素对比和dom结构对比两个方向

    - PhantomCSS
    - page-monitor
    - [Airtest](https://github.com/AirtestProject/Airtest)

- 功能测试：

    - Phantomjs + CasperJS
    - PhantomFlow

- 性能测试

    - Phantomas
    - LightHouse

- 兼容性测试：dalekjs, triflejs


## 测试工具
### 断言

- [chai](https://github.com/chaijs/chai)：适用于 node.js 和浏览器的 BDD / TDD 断言框架，并能搭配其它测试框架使用。
- [Sinon.JS](https://github.com/sinonjs/sinon)：对 JavaScript 进行 spies、stubs 和 mock 测试。
- [expect.js](https://github.com/Automattic/expect.js)：简约的、适用于 Node.js 和浏览器端的 BDD 式断言工具。
- [should.js](https://github.com/tj/should.js)：适用于 Node.js 的 BDD 式断言工具。

### 框架

- [mocha](https://github.com/mochajs/mocha)：适用于 node.js 和浏览器、简易、灵活、有趣的 JavaScript 测试框架。
- [jasmine](https://github.com/jasmine/jasmine)：简单无 DOM 的 JavaScript 测试框架。
- [qunit](https://github.com/jquery/qunit)：一个易于使用的 JavaScript 单元测试框架。
- [jest](https://github.com/facebook/jest)：简单的 JavaScript 单元测试框架。
- [prova](https://github.com/azer/prova)：基于 Tape 和 Browserify 的测试运行器，它适用于 Node & 浏览器。
- [DalekJS](https://github.com/dalekjs/dalek)：自动化且跨浏览器的 JavaScript 功能测试框架。
- https://github.com/avajs/ava

### 覆盖率

- [istanbul](https://github.com/gotwarlost/istanbul)：另一个 JS 代码覆盖率检测工具。
- [blanket](https://github.com/alex-seville/blanket)：一个简单的代码覆盖率检测库。它的设计理念是易于安装和使用，且可用于浏览器端和 node.js。
- [JSCover](https://github.com/tntim96/JSCover)：JSCover 是一个检测 JavaScript 程序代码覆盖率的工具。

### 运行器

- [phantomjs](https://github.com/ariya/phantomjs)：脚本化的 Headless WebKit。
- [slimerjs](https://github.com/laurentj/slimerjs)：一个内核为 Gecko 的类似 PhantomJS 工具。
- [casperjs](https://github.com/n1k0/casperjs)：基于 PhantomJS 和 Slimer JS 的导航脚本和测试工具。
- [zombie](https://github.com/assaf/zombie)：基于 node.js 、快速、全栈且无图形界面的浏览器的测试工具。
- [totoro](https://github.com/totorojs/totoro)：一个简单可靠且能跨浏览器运行的测试工具。
- [karma](https://github.com/karma-runner/karma)：一个优秀的的 JavaScript 测试运行器。
- [nightwatch](https://github.com/nightwatchjs/nightwatch)：基于 node.js 和 selenium webdriver 的图形界面自动化测试框架。
- [intern](https://github.com/theintern/intern)：下一代 JavaScript 代码测试栈。
- [yolpo](http://www.yolpo.com/)：在浏览器逐句执行的 JavaScript 解释器。

### 辅助

- https://github.com/Huddle/PhantomCSS
- https://github.com/fouber/page-monitor

### 持续集成

- jenkin
- http://wercker.com/
- https://semaphoreci.com/
- https://codeship.com
- https://circleci.com/

### 假数据

- http://chancejs.com/#
- https://github.com/Marak/Faker.js


## 开发模式

- TDD：Test Drive Development，测试驱动开发
- BDD：Behavior Drive Development，行为驱动开发
- DDD：Domain Drive Design，领域驱动开发

## 参考文献
- [前端自动化测试探索](http://fex.baidu.com/blog/2015/07/front-end-test/)
- [如何进行前端自动化测试？](https://www.zhihu.com/question/29922082)
- [7 天打造前端性能监控系统](http://fex.baidu.com/blog/2014/05/build-performance-monitor-in-7-days/)
- [测试驱动开发（TDD）介绍中的误区](http://blog.jobbole.com/64431/)
- [关于TDD、BDD和DDD的一些看法](http://www.cnblogs.com/ustbwuyi/archive/2012/10/26/2741223.html)
- 【What’s the difference between Unit Testing, TDD and BDD?](https://codeutopia.net/blog/2015/03/01/unit-testing-tdd-and-bdd/)
---

- [完成 E2E 测试的 5 个最佳 Node.js 工具](https://medium.com/@adrian_lewis/top-5-most-rated-node-js-frameworks-for-end-to-end-web-testing-f8ebca4e5d44#.vk449a1r5)
- [TestCafe](https://zhuanlan.zhihu.com/p/25973163)
- [page-monitor](https://github.com/fouber/page-monitor)
- [为何国内的前端对自动化测试好像不是很看重？](https://www.zhihu.com/question/57415062)

---

- https://github.com/tebelorg/TagUI
- https://github.com/alibaba/uirecorder

---

- [前端自动化测试探索](http://fex.baidu.com/blog/2015/07/front-end-test/)
- http://rupl.github.io/frontend-testing/
- https://www.phase2technology.com/blog/css-testing-with-phantomcss-phantomjs-casperjs-and-grunt/
- http://blog.nodejitsu.com/npmawesome-page-metrics-with-phantomas/
- http://fideloper.com/ubuntu-beanstalkd-and-laravel4
- http://www.yegor256.com/2014/10/05/ten-hosted-continuous-integration-services.html
- [自动化测试的成本高效果差，那么自动化测试的意义在哪呢](http://www.zhihu.com/question/19786019)
- [如何进行前端自动化测试？](https://www.zhihu.com/question/29922082)
- [javascript单元测试](http://www.cnblogs.com/frostbelt/archive/2012/08/03/2622302.html)
- [Jest vs. Mocha: Why Jest Wins](http://andrew.codes/jest-vs-mocha-why-jest-wins/)
- [大家写 js 都用什么测试框架？](https://www.v2ex.com/t/266660)
- https://www.awesomes.cn/repos/Applications/testings
- http://www.ruanyifeng.com/blog/2015/12/a-mocha-tutorial-of-examples.html
- [GUI软件测试](http://baike.baidu.com/view/5131653.htm)
- [7 天打造前端性能监控系统](http://fex.baidu.com/blog/2014/05/build-performance-monitor-in-7-days/)
- [如何编写测试](http://growth.phodal.com/#如何编写测试)
- [Coding-Guide](https://github.com/ecmadao/Coding-Guide/blob/master/Notes/UnitTest/%E5%89%8D%E7%AB%AF%E5%8D%95%E5%85%83%E6%B5%8B%E8%AF%95%E6%8E%A2%E7%B4%A2.md)
