- 输入接收：命令模式

    优秀的软件设计通常会将关注点进行分离， 而这往往会导致软件的分层。 最常见的例子： 一层负责用户图像界面； 另一层负责业务逻辑。 GUI 层负责在屏幕上渲染美观的图形， 捕获所有输入并显示用户和程序工作的结果。 当需要完成一些重要内容时 （比如计算月球轨道或撰写年度报告）， GUI 层则会将工作委派给业务逻辑底层。

    命令模式可将请求转换为一个包含与请求相关的所有信息的独立对象。 该转换让你能根据不同的请求将方法参数化、 延迟请求执行或将其放入队列中， 且能实现可撤销操作。

    - 要支持撤销和恢复功能
    - 要支持删除功能

- 状态维护：状态模式

    状态模式负责解析输入值

- 计算逻辑：算数表达式解析 + 策略模式

    策略模式让你能将各种算法的代码、内部数据和依赖关系与其他代码隔离开来，不同客户端可通过一个简单接口执行算法，并能在运行时进行切换。