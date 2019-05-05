`ngApp` 自动启动 Angular 程序。

[Document](https://docs.angularjs.org/api/ng/directive/ngApp)

# 要点
- 每个 HTML 只允许自动启动一个程序，第一个发现的 `ngApp` 作为自动启动的根元素

    如果要在一个 HTML 里运行多个程序，必须手动启动（`angular.bootstrap`）。

- Angular 程序不能相互嵌套
- 不要在同一 HTML 元素上和带有 `transclusion` 的指令一起使用，例如：`ngIf`，`ngInclude`，`ngView` 等

# 用法
```
<ng-app
  ng-app="angular.Module"
  [ng-strict-di="boolean"]
>
  ...
</ng-app>
```

或者

```
<ANY
  ng-app="angular.Module"
  [ng-strict-di="boolean"]
>
  ...
</ANY>
```
