# 为什么要依赖注入？
...

# 怎么注册服务？

- `value`
- `constant`
- `service`
- `factory`
- `provider`

# 服务间的依赖关系
- 定义在一个模块中的服务可以依赖于其他模块的服务吗？

    定义在某模块中的服务，对其他模块可见。也就是说，模块的依赖层级不影响服务对其他模块的透明度。

- 定义在子模块中的服务可以依赖于父模块中的服务吗？

    AngularJS 在引导应用启动时，它在不同模块中定义的所有服务都被导入应用，相当于全局命名空间。

- 存在只有特定模块可见的私有服务吗?

    AngularJS 还不支持模块内的私有服务

- 在不用的模块中可以定义同名服务吗？

    AngularJS 应用中的服务是不能重名，父模块中的服务会覆盖子模块中的同名服务。
