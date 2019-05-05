Angular 作用域是一个引用了程序模型的对象，是表达式执行的上下文。作用域是模仿程序的 DOM 层次结构来组织的，它可以监听表达式和传播事件。

- `$rootScope`
- `$scope`
- `$parent`
- `$$childHead`
- `$$childTail`

# 指令作用域
以下指令会创建新的 scope, 并且会在原型上继承父 scope：

- ng-repeat
- ng-switch
- ng-view
- ng-controller
- 带有 `scope: true` 的指令（继承）
- 带有 `transclude: true` 的指令
- 带有 `scope: { ... }` 的指令, 这会创建一个独立的 scope（在原型上不继承父 scope）

    - `@`
    - `=`
    - `&`

备注：

- 默认指令并不会创建 scope, 默认是 `scope: false`, 通常称之为共享 scope
- [一招制敌 - 玩转 AngularJS 指令的 Scope (作用域)](https://segmentfault.com/a/1190000002773689)
- [AngularJS Directive 隔离 Scope 数据交互](https://blog.coding.net/blog/angularjs-directive-isolate-scope)
- [Angular学习心得之directive——scope选项与绑定策略](https://my.oschina.net/u/2342955/blog/408889)
- [angularjs的ng-repeat指令下的scope作用域](http://www.cnblogs.com/liulangmao/p/4493553.html)

# 参考文献

- [Understanding Scopes](https://github.com/angular/angular.js/wiki/Understanding-Scopes)
- [[译文]深入浅出AngularJS作用域](http://blog.lxjwlt.com/front-end/2015/06/04/understanding-angular-scope.html)
- [AngularJS 作用域与数据绑定机制](https://www.ibm.com/developerworks/cn/opensource/os-cn-AngularJS/)
- [从 JavaScript 继承说起, 深入理解 Angular Scope 继承关系](https://segmentfault.com/a/1190000004358393#articleHeader0)
- [AngularJS实例教程（二）——作用域与事件](https://github.com/xufei/blog/issues/18)
- [剖析AngularJS作用域](http://www.cnblogs.com/giggle/p/5769047.html)
- [深入理解 AngularJS 的 Scope](http://www.lovelucy.info/understanding-scopes-in-angularjs.html)
