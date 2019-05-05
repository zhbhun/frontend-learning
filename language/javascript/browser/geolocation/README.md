# 地理位置

## API

- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation)

    - [Navigator​.geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/geolocation)
    - [Geolocation​.get​Current​Position()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition)
    - [Geolocation​.watch​Position()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition)
    - [Geolocation​.clear​Watch()](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/clearWatch)

- [Position​Options](https://developer.mozilla.org/en-US/docs/Web/API/PositionOptions)
- [Position](https://developer.mozilla.org/en-US/docs/Web/API/Position)
- [Coordinates](https://developer.mozilla.org/en-US/docs/Web/API/Coordinates)
- [Position​Error](https://developer.mozilla.org/en-US/docs/Web/API/PositionError)

## 规范

[Geolocation API](https://dev.w3.org/geo/api/spec-source.html)

## 原理

- [HTML5 中 Geolocation 获取地理位置的原理是什么？](https://www.zhihu.com/question/20473051)
- [我们常用的手机的定位方式有哪些？](https://coffee.pmcaff.com/article/492872948080768/pmcaff?utm_source=forum&from=related&pmc_param%5Bentry_id%5D=414603611639936)
- [我们经常用到的手机定位的原理到底是什么？](https://www.jianshu.com/p/a776ed702765)
- [GPS定位基本原理浅析](https://www.cnblogs.com/magicboy110/archive/2010/12/12/1903927.html)
- [GSM蜂窝基站定位基本原理浅析](https://www.cnblogs.com/magicboy110/archive/2010/12/12/1903927.html)
- [AGPS 定位基本原理浅析](https://www.cnblogs.com/magicboy110/archive/2010/12/12/1903927.html)
- [GPS与AGPS的区别](https://www.jianshu.com/p/d568e11fbee7)
- [移动设备究竟是怎样仅仅使用 Wi-Fi 来定位的？](https://www.zhihu.com/question/20355764/answer/26765991)

## 教程

- [使用 HTML5 Geolocation 构建基于地理位置的 Web 应用](https://www.ibm.com/developerworks/cn/web/1208_wangjian_html5geo/index.html)
- [前端开发中的地理定位问题小总结](https://wufenfen.github.io/2017/03/22/%E5%89%8D%E7%AB%AF%E5%BC%80%E5%8F%91%E4%B8%AD%E7%9A%84%E5%9C%B0%E7%90%86%E5%AE%9A%E4%BD%8D%E9%97%AE%E9%A2%98%E5%B0%8F%E6%80%BB%E7%BB%93/)
- [h5 geolocation 的那些事～](https://cloud.tencent.com/developer/article/1009785)
- [HTML5 地理位置定位（HTML5 Geolocation）原理及应用](http://www.cnblogs.com/lhb25/archive/2012/07/10/html5-geolocation-api-demo.html)
- [几个有用的Web API——地理位置API](https://juejin.im/entry/5b0cc3c5518825154a472a2b)
- [Who moved my geolocation?](https://hacks.mozilla.org/2013/10/who-moved-my-geolocation/)

### 中国位置服务 API

- [腾讯位置服务-前端定位组件](https://lbs.qq.com/tool/component-geolocation.html)
- [百度地图开放平台-JavaScript API](http://lbsyun.baidu.com/index.php?title=jspopular/guide/geolocation)
- [高德地图开发平台-JS API](https://lbs.amap.com/api/javascript-api/guide/services/geolocation#geolocation)

### 使用 IP 定位

- http://geobytes.com/iplocator/
- [如何使用ip地址进行物理定位？](https://www.zhihu.com/question/284835402)
- [分享几个IP获取地理位置的API接口](https://cloud.tencent.com/developer/article/1152362)
- [怎么选择靠谱的IP地理位置定位产品？](https://www.ipplus360.com/tech/baike/ip/125.html)

### 应用案例

- [用 HTML5 Geolocation 实现一个距离追踪器](https://segmentfault.com/a/1190000014210086)


---

## 兼容性

### Android

- 网络对定位的影响

  | 定位\网络 | wifi / 移动数据 | 无 |
  | --- | --- | --- |
  | 未开启 | 支持 | 提示找不到 GPS |
  | 网络定位 | 支持 | 提示找不到 GPS |
  | GPS 定位 | 支持 | 提示找不到 GPS |
  | 网络定位和 GPS 定位 | 支持 | 提示找不到 GPS |

  疑问：不同的定位方式好像没什么区别。

- 权限对定位的影响

  | 权限\ | 支持 |
  | --- | --- |
  | 询问 | 否，提示超时 |
  | 有 | 是，依赖设备 |
  | 无 | 否，提示超时 |

  ps: 安卓是否会弹出权限申请依赖客户端的实现，大部分浏览器会支持，但是个别 App 不支持，例如：美柚，以上的测试数据来源于美柚客户端

### iOS

| 定位\网络 | wifi / 移动数据 | 无 |
| --- | --- | --- |
| 第一次 | 提示授权定位，同意可获取位置 | 提示授权定位，同意可获取位置 |
| 有 | 支持 | 支持 |
| 无 | 提示未授权 | 提示未授权 |

ps：iOS 第一次使用定位 API 时会提示是否授权使用定位权限
