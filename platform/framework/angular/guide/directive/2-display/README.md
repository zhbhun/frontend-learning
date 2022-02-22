# Guide
- [Interpolation and data-binding](https://docs.angularjs.org/guide/interpolation)

# API
- [ngBind](https://docs.angularjs.org/api/ng/directive/ngBind)
- [ngBindHtml](https://docs.angularjs.org/api/ng/directive/ngBindHtml)
- [ngCloak](https://docs.angularjs.org/api/ng/directive/ngCloak)

# 要点
- 插值指令，插值指令的定界符是可配置的，默认是 `{{}}`

    ```
    module.config(fucntion ($interpolateProvider) {
      $interpolateProvider.startSymbol('[[');
      $interpolateProvider.endSymbol(']]');
    })
    ```
    
- 插值指令和 ngBind 指令会对表达式中的任何 HTML 标记都进行转义；
- ngBindHtml 指令可以选择性地净化指定的 HTML 标签；
- 以上指令不仅仅用于初次渲染，Angular 还会对数据源进行持续监视，在有任何变化发生时，都会重新渲染
