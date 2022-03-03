```javascript
app.directive('helloWorld', function() {
  return {
    restrict: string, // AEC
    replace: boolean,
    template: string, // HTML
    link: function(scope, elem, attrs) {...},
    compile: function(tElem, attrs) {
      // do optional DOM transformation here
      return function(scope,elem,attrs) {
        // linking function here
      };
    },
    scope: boolean | object,
  };
});
```

# restrict
这个属性用来指定指令在HTML中如何使用。

- `E`：元素
- `A`：属性
- `C`：类名
- 注释

# template
这个属性规定了指令被 Angular 编译和链接（link）后生成的 HTML 标记。

# replace
这个属性指明生成的 HTML 内容是否会替换掉定义此指令的 HTML 元素。

# link
link 函数主要用来为 DOM 元素添加事件监听、监视模型属性变化、以及更新 DOM。

- `scope`：指令的 scope，在默认情况下，指令的 scope 就是父 controller 的 scope。
- `elem`：指令的 jQLite(jQuery 的子集)包装 DOM 元素。
- `attr`：一个包含了指令所在元素的属性的标准化的参数对象。

# compile
compile 函数在 link 函数被执行之前用来做一些 DOM 改造

- `tElem`：指令所在的元素
- `attrs`：元素上赋予的参数的标准化列表

备注：

- 要注意的是 compile 函数不能访问 scope，并且必须返回一个 link 函数（有了compile，就不能用 link，link 函数由 compile 返回）。
- 大多数的情况下，你只需要使用 link 函数。这是因为大部分的指令只需要考虑注册事件监听、监视模型、以及更新 DOM 等，这些都可以在 link 函数中完成。但是对于像 ng-repeat 之类的指令，需要克隆和重复 DOM 元素多次，在 link 函数执行之前由 compile 函数来完成。这就带来了一个问题，为什么我们需要两个分开的函数来完成生成过程，为什么不能只使用一个？

    > 当应用引导启动的时候，Angular 开始使用 $compile 服务遍历 DOM 元素。这个服务基于注册过的指令在标记文本中搜索指令。一旦所有的指令都被识别后，Angular 执行他们的 compile 方法。如前面所讲的，compile 方法返回一个 link 函数，被添加到稍后执行的 link 函数列表中。这被称为编译阶段。如果一个指令需要被克隆很多次（比如 ng-repeat），compile 函数只在编译阶段被执行一次，复制这些模板，但是 link 函数会针对每个被复制的实例被执行。所以分开处理，让我们在性能上有一定的提高。这也说明了为什么在 compile 函数中不能访问到 scope 对象。 在编译阶段之后，就开始了链接（linking）阶段。在这个阶段，所有收集的 link 函数将被一一执行。指令创造出来的模板会在正确的 scope 下被解析和处理，然后返回具有事件响应的真实的 DOM 节点。

# scope
默认情况下，指令获取它父节点的 controller 的 scope。但这并不适用于所有情况。如果将父 controller 的 scope 暴露给指令，那么他们可以随意地修改 scope 的属性。

- `false`：使用父 controller 的 scope
- `true`：新建一个子 scope，这个 scope 原型继承父 scope
- `object`：新建一个隔离的 scope

    - `@`:单向绑定
    
        当父 scope 的属性变化时，你的隔离 scope 模型中的属性值跟着变化（父 scope 属性变化会覆盖掉隔离 scope 的属性变化）。然而，反向的传递并不工作。你不能通过对隔离 scope 属性的操作来改变父 scope 的值。

        备注：与 `scope = false` 不同，单项绑定只能通过插值表达式传递简单的字符串，并且父 scope 的值变化会覆盖隔离 scope 的属性变化。

    - `=`：双向绑定

        双向绑定可以给属性指定一个真实的 scope 数据模型，而不是简单的字符串。同时，还支持双向的绑定。每当父 scope 属性变化时，相对应的隔离 scope 中的属性也跟着改变，反之亦然。和之前的一样，你也可以监视这个 scope 属性的变化。

    - `&`：表达式

# transclusion
Transclusion 是让我们的指令包含任意内容的方法。我们可以延时提取并在正确的 scope 下编译这些嵌入的内容，最终将它们放入指令模板中指定的位置。

- `true`
- `element`

> 有时候我我们要嵌入指令元素本身，而不仅仅是它的内容。在这种情况下，我们需要使用 transclude:’element’。它和 transclude:true 不同，它将标记了 ng-transclude 指令的元素一起包含到了指令模板中。使用transclusion，你的link函数会获得一个名叫 transclude 的链接函数，这个函数绑定了正确的指令scope，并且传入了另一个拥有被嵌入DOM元素拷贝的函数。你可以在这个 transclude 函数中执行比如修改元素拷贝或者将它添加到DOM上等操作。 类似 ng-repeat 这样的指令使用这种方式来重复DOM元素。

[AngularJS : When to use transclude 'true' and transclude 'element'?](http://stackoverflow.com/questions/18449743/angularjs-when-to-use-transclude-true-and-transclude-element)

# controller & requrie
如果你想要允许其他的指令和你的指令发生交互时，你需要使用 controller 函数。比如有些情况下，你需要通过组合两个指令来实现一个UI组件。

