# 样式设置
- 局部变量：不推荐
- 模块全局常量：推荐，如何确保样式的复用性？
- 应用全局常量：一些公用的颜色和排版数据，待整理！
- 多样式：实现主题？
- 附加样式：覆盖子组件样式
- 高阶组件：包装组件
- store / context：主题切换？

# 主题机制
分析：主题切换时那些组件需要变换颜色？

- 导航栏：背景色，文本色，图标色
- 底部页签栏：背景色，文本色，图标色
- 容器：背景色，提示文本色
- 卡片：背景色，标题色，主要文本色，辅助文本色，按钮色，图标色
- 表单：TODO
- 图标
- 按钮
- 总结：主要涉及背景色，文本色的切换

实现

- 多样式属性 + 全局订阅（context / flux / redux）

    - 思路：全局订阅主题变化，根据主题来给每个组件的设置颜色样式
    - 优点：。。。
    - 缺点：编码繁琐，重复代码过多，例如：每个页面的容器背景色是一致的，这种实现方式要在每个页面的根组件上重复编写主题判断代码。

- 自定义样式管理工具

    - 思路：全局预定义主题配色（已知的组件能够确认，比较可控），利用工具对象给组件设置样式，主题切换交给工具对象去统一处理
    - 优点：简化主题实现
    - 缺点：待确认是否可行


参考

- [干货：如何在React Native中设计主题机制](http://bbs.reactnative.cn/topic/18/%E5%B9%B2%E8%B4%A7-%E5%A6%82%E4%BD%95%E5%9C%A8react-native%E4%B8%AD%E8%AE%BE%E8%AE%A1%E4%B8%BB%E9%A2%98%E6%9C%BA%E5%88%B6)
- [react-native-theme](https://github.com/apentle/react-native-theme)
- https://github.com/brunolemos/react-themable
- http://www.sparknotes.com/lit/nativeson/themes.html
- https://medium.com/the-react-native-log/tips-for-styling-your-react-native-apps-3f61608655eb

# 样式属性 vs 渲染方法
什么时候使用样式属性，什么时候使用渲染方法？

答：开源公共或底层组件库使用渲染方法，项目公共组件使用样式属性

# 输入框要点
1. 键盘遮挡
2. 键盘消失


---

- https://strapmobile.com/
- http://startreact.com/themes/native-starter/
- [20分钟理解React Native For Android原理](https://blog.souche.com/react-native-source-code-analysis/)
- [React Native通讯原理](http://www.jianshu.com/p/17d6f6c57a5c)

---

- https://github.com/attentiveness/reading
- https://richardcao.me/2016/07/05/Talk-About-Reading/


---

- [庖丁解牛！深入剖析 React Native 下一代架构重构](https://www.infoq.cn/article/EJYNuQ2s1XZ88lLa*2XT)
