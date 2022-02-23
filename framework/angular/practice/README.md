# 组织结构
存在问题：旧项目完全按照架构层次组织文件，随着业务增长项目变得越来越复杂，按照架构层次划分的项目变得越来越难以维护

解决方案：大部分应用按照特性组织文件，功能相关的脚本和子模板在一起，这样被修改的所有文件同属于一组，非常有利于在应用的垂直切面上工作。公共基础组件不像功能性代码那样频繁变化，在典型的应用生命周期中，一些基础组件很早就被写好，关注点很快会随着应用的成熟转移到功能性代码中，因此，通用的、基础级别的文件最好按照架构层来组织。


```
.
├── build 构建脚本
├── dist 构建结果
├── src 源代码
│   ├── styles
│   ├── images
│   ├── common
│   │   ├── components
│   │   ├── directives
│   │   ├── services
│   │   ├── filters
│   │   └── ...
│   ├── app
│   │   ├── home
│   │   │   ├── home.module.js
│   │   │   ├── home.ctrl.js
│   │   │   ├── home.tpl.html
│   │   │   ├── home.style.css
│   │   │   ├── index.js
│   │   ├── about
│   │   ├── notfound
│   │   └── ...
├── test 测试代码
├── node_modules 第三方依赖
└── ...
```

# 命名规范
- module
- service
- factory
- provider

# 开发规范
- 一个文件，一个模块

    在单个文件中定义多个模块，并非十分有害，但可能会**导致单个文件中的代码行数过多**。这让我们**很难在代码库中发现所需的特定模块**，因为不但要在文件系统中找到文件，还要在文件中找到模块。所以，在单个文件中定义多个模块， 也许对非常简单的项目有效，但在较大的代码库中，表现并不乐观。

- 一个模块不允许跨越多个 JavaScript 文件

    让一个模块跨越多个文件，或许是应该避免的。当单个模块的代码分布在多个文件中时，就**要考虑那些文件的加载顺序**：模块需要定义在注册 `provider` 之前。 此外，这样的**模块也会变得越来越大，越来越难以维护**。在单元测试中，我们希望加载和测试尽量小的代码片段，因此，大模块也不利于单元测试。

- 使用链式语法注册所有的 `provider`

    TODO：对比中间变量和每次调用 `module` 方法获取模块实例。

---

- [AngularJS开发人员最常犯的10个错误](http://blog.jobbole.com/78946/)

---

- [AngularJS: "Controller as" or "$scope"?](http://lib.csdn.net/article/angularjs/42911)
- [AngularJS: "Controller as" or "$scope"?](http://www.tuicool.com/articles/Mfeimu)
- [Controller As与$scope的区别（$scope篇)](http://www.jianshu.com/p/00e0ffc770c8)
- [angular controller as syntax vs scope](http://www.cnblogs.com/whitewolf/p/3493362.html)
- [The Top 5 Mistakes AngularJS Developers Make Part 1: Relying on $scope](http://csharperimage.jeremylikness.com/2014/11/the-top-5-mistakes-angularjs-developers.html)
