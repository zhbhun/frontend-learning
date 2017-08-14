# 测试原理
- 测试框架：判断内部是否存在异常，存在则输出对应的错误信息；
- 断言库：当实际值和期望值不一样时，就抛出异常，供外部测试框架检测到；
- Mock 库：需要测试的单元依赖于外部的模块，而这些依赖的模块具有一些特点，例如不能控制、实现成本较高、操作危险等原因，不能直接使用依赖的模块，这样情况下就需要对其进行 mock，也就是伪造依赖的模块；

# 测试工具
- 测试框架

    - [QUnit](https://qunitjs.com/)
    - [jasmine](http://jasmine.github.io/)
    - [mocha](http://mochajs.org/)
    - [jest](https://facebook.github.io/jest/)
    - [karma](https://github.com/karma-runner/karma)
    - [tape](https://github.com/substack/tape/)
    - [intern](https://theintern.github.io/)

- 断言库

    - [chai](http://chaijs.com/)
    - [should.js](http://shouldjs.github.io/)
    - [expect.js](http://shouldjs.github.io/)
    - [assert](https://nodejs.org/api/assert.html)

- Mock 库

    - [sinon.js](http://sinonjs.org/)
    - [buster.js](http://docs.busterjs.org/en/latest/)

# 测试原则
- 只考虑测试，不考虑内部实现
- 数据尽量模拟现实，越靠近现实越好
- 充分考虑数据的边界条件
- 对重点、复杂、核心代码，重点测试

# 实际应用
> 业务开发很难做到 TDD 开发，一是因为需要更多时间编写单元测试用例；二是要求非常了解业务需求；三是要求开发人员有很强的代码设计能力。但是当我们写组件、工具方法、类库的时候，TDD 就可以得到很好地使用。

# 参考文献
- [前端单元测试总结](http://zhenhua-lee.github.io/tech/test.html)
- [React Testing – Jest or Mocha?](https://spin.atomicobject.com/2017/05/02/react-testing-jest-vs-mocha/)
