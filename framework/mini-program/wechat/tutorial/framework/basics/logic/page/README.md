# 页面

## 基础

### 生命周期

onLoad =》 onShow =》onReady =》 onHide =》 onShow => onUnload

- AppService Thead：逻辑线程

    start(create) => created => waiting notify...(view inited notify + send initial data) => waiting notify...(first render) => active => alive => active => end

- View Thead：渲染线程

    start(init) => inited(send inited nofify) => waiting data..（ app service initial data） => render(send first render notify) => ready => rerender => end 

参考文献

- [生命周期](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/page-life-cycle.html)

### 退出状态保存

https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/operating-mechanism.html#_4-%E9%80%80%E5%87%BA%E7%8A%B6%E6%80%81
