
- [Redux入坑进阶-源码解析](https://github.com/ecmadao/Coding-Guide/blob/master/Notes/React/Redux/Redux%E5%85%A5%E5%9D%91%E8%BF%9B%E9%98%B6-%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90.md)
- [jiechud/redux-source-analyze](https://github.com/jiechud/redux-source-analyze)
- [redux源码分析与设计思路剖析 ](https://github.com/WisestCoder/blog/issues/1)

## redux-saga

### 优缺点

- 优点

    - 流程拆分更细，异步的action 以及特殊要求的action（更复杂的action）都在sagas中做统一处理，流程逻辑更清晰，模块更干净；
    - 以用同步的方式写异步代码，可以做一些async 函数做不到的事情 (无阻塞并发、取消请求)
    能容易地测试 Generator 里所有的业务逻辑
    - 可以通过监听 Action 来进行前端的打点日志记录，减少侵入式打点对代码的侵入程度

- 缺点

    - action 任务拆分更细，原有流程上相当于多了一个环节。对开发者的设计和抽象拆分能力更有要求，代码复杂性也有所增加。
    - 异步请求相关的问题较难调试排查
