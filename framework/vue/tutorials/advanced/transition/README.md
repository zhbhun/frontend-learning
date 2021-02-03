# 过渡动画

- 自动设置 CSS 过渡动画类
- 可以集成第三方 CSS 动画库，例如：Animate.css
- 可以集成第三方 JavaScript 动画库，例如：Velocity.js

## Trasition

| 类名 | 插入前 | 插入后 | 插入后一帧 | 进入动画结束 | 触发离开 | 触发离开后一帧 | 离开动画结束 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| v-enter | ✔ | ✔ | | | | | |
| v-enter-active | ✔ | ✔ | ✔ | | | | |
| v-enter-to | |  | ✔ | | | | |
| v-leave | | | | | ✔ | | |
| v-leave-active | | | | | ✔ | ✔ | |
| v-leave-to | |  | | | | ✔ | |

![transition](https://vuejs.org/images/transition.png)

> https://codesandbox.io/s/vue-transition-hr92e?file=/src/demo/between/element.vue

<iframe src="https://codesandbox.io/embed/vue-transition-hr92e?fontsize=14&hidenavigation=1&theme=dark"
     style="width:100%; height:500px; border:0; border-radius: 4px; overflow:hidden;"
     title="vue transition"
     allow="accelerometer; ambient-light-sensor; camera; encrypted-media; geolocation; gyroscope; hid; microphone; midi; payment; usb; vr; xr-spatial-tracking"
     sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
   ></iframe>
