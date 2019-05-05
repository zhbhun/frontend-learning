# 模块加载 / 生命周期
- 配置阶段：注册 `provider`，只有 `providers` 和 `constants` 才可以注入到配置阶段（`services` 等在此阶段不会实例化）。
- 运行阶段：在 `injector` 创建后执行，除了 `providers` 外，可以注入任意常量和实例。

```javascript
angular.module('myModule', []).
config(function(injectables) { // provider-injector
  // This is an example of config block.
  // You can have as many of these as you want.
  // You can only inject Providers (not instances)
  // into config blocks.
}).
run(function(injectables) { // instance-injector
  // This is an example of a run block.
  // You can have as many of these as you want.
  // You can only inject instances (not Providers)
  // into run blocks
});
```

# 依赖关系
- 被依赖模块的配置阶段会在引入依赖的模块配置之前执行
- ...


# 最佳实践
- > A module for each feature.
- > A module for each reusable component (especially directives and filters).
- > And an application level module which depends on the above modules and contains any initialization code.

参考 [Recommended Setup](https://docs.angularjs.org/guide/module#recommended-setup)

---

- [Using ES6 Modules with AngularJS 1.3](https://gocardless.com/blog/es6-angular/)
- [nodejs-angularjs-common-modules.md](https://gist.github.com/sevcsik/9207267)

---


