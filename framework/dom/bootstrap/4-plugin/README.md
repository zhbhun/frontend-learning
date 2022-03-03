# 插件用法
- HTML 用法

    默认情况下，所有的插件都可以通过设置特定的 HTML 代码和相应的属性（或自定义属性）来实现。在网页加载的时候， JavaScript 代码会自动检测这些标记，并自动绑定相应的事件，而无需再添加额外的 JavaScript 代码。

    例如：警告框组件只要在 button 元素上添加 data-dismiss="alert" 属性，那么在单击该 button 的时候就会关闭该警告框。

    ```
    <div class="alert">
      <button type="button" class="close" data-dismiss="alert">×</button>
      <strong>警告 !</strong>
    </div>
    ```

- JavaScript 用法

    所有的插件不仅可以使用声明式定义（ HTML ），也可以通过 JavaScript 代码全部实现。利用 jQuery 的链式操作，编出的代码非常优美。

    ```javascript
    $(".btn.btn-danger").button("toggle").addClass("fat");
    ```

    所有的插件在使用 JavaScript 代码调用的时候，都提供多种调用方式：无参数传递（即默认方式）、传递对象字面量进行初始化参数设定、直接传入一个需要执行的方法名称字符串。

    ```
    $("#myModal").modal() // 默认值进行初始化
    $("#myModal").modal({ keyboard: false }) // 初始化时 keyboard 选项值是 false
    $("#myModal").modal('show') // 初始化，然后立即调用 show 方法
    ```

    每个插件都有一个 Constructor 属性，用于表示原始的构造函数，例如 $.fn.alert.Constructor 。另外也可以通过 `$('{选择器}'）.data('bs{插件名称}')` 的形式获取该特定插件的实例，例如：`$('[data-dismiss="alert"]').data('bs.alert')`。

- 自定义事件监听

    Bootstrap 为很多插件都提供了自定义事件功能，例如：modal 弹窗里提供的 show 和 shown 事件，show 事件在弹窗初始化（即将弹出）的时候触发，而 shown 事件则是在弹窗初始化完毕后（完全弹出）才触发。

    所有的插件都提供了 preventDefault 功能，用于阻止继续执行后续的代码。例如，可以在 modal 弹窗的 show 事件里进行判断，如果不符合条件就拒绝显示弹窗。

    ```javascript
    $('#myModal').on('show.bs.modal', function (e) {
      if (!data) return e.preventDefault() // 拒绝显示弹窗
    })
    ```

- 禁用 HTML 用法

    Bootstrap 所有的 JavaScript 插件都可以通过配置使用，即通过特定的 HTML 设置，而不需要任何 JavaScript 再次触发。但如果需要启用手动触发事件的行为，可以禁用默认的行为，禁用方法非常简单，只需要将 body 元素上的命名空间为 data-api 下的全部事件禁用即可。

    - 禁用所有默认行为：`$(document).off('.data-api');`
    - 禁用特定插件的默认行为：`$(document).off('.bs.alert.data-api');`
    - 禁用特定插件的特定默认行为：`$(document).off('click.bs.alert.data-api');`

# 实现原理
1. 声明立即执行函数；

    防止插件内部变量污染全局命名空间。

2. 定义插件类及相关的原型方法；

    实现相关元素的插件处理逻辑。

3. 设置 jQuery 插件方法和构造函数；

    提供插件调用接口。

4. 设置 JQuery 防冲突处理；

    解决插件冲突问题。

    ```javascript
    // 返回 $.fn.button 对象给 bootstrapButton 变量
    var bootstrapButton = $.fn.button.noConflict()
    // 将 bootstrapButton 变量赋予一个新插件名称 $().bootstrapBtn, 这时 $().bootstrapBtn 就拥有了先前 button 的所有功能了
    $.fn.bootstrapBtn = bootstrapButton
    ```

5. 绑定各种触发事件；

    自动为插件的 HTML 用法相关元素调用插件或绑定事件。


# 插件扩展
插件事件命名规范

- 插件自定义事件命名空间

    `{状态}.bs.{插件名称}`

    示例：

    ```
    $('#myModal').on('show.bs.modal', function (e) {
      return e.preventDefault() // 拒绝显示弹窗
    })
    ```

- 插件监听事件命名空间

    `{事件类型}.bs.{插件名称}.data-api`

    示例：

    - 监听组件子元素事件：`$(document).on('click.bs.alert.data-api', '[data-dismiss="alert"]', Alert.prototype.close)`
    - 监听全局事件：`$(window).on('scroll.bs.affix.data-api', $.proxy(this.checkPosition, this))`
