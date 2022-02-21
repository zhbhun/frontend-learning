模块
========

- Shadow DOM

    > Shadow DOM是WebComponents的标准。它能解决全局污染问题，但目前很多浏览器不兼容，对我们来说还很久远；

- CSS in JS

    > CSS in JS是彻底抛弃CSS，使用JS或JSON来写样式。这种方法很激进，不能利用现有的CSS技术，而且处理伪类等问题比较困难；

- CSS Modules

    > CSS Modules仍然使用CSS，只是让JS来管理依赖。它能够最大化地结合CSS生态和JS模块化能力，目前来看是最好的解决方案。Vue的scoped style也算是一种。

## 参考文献

- https://github.com/MicheleBertoli/css-in-js
- https://github.com/css-modules/css-modules
- https://github.com/linkedin/css-blocks
