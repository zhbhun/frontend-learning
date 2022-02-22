# 路由

## 基础

### 路由操作

**API**

- 打开新页面：`wx.navigateTo`
- 打开其他小程序：`wx.navigateToMiniProgram`
- 重定向：`wx.redirectTo`
- 切换 Tab：`wx.switchTab`

    ps：Tab 是全局唯一的，切换后会释放当前路由栈

- 返回：`wx.navigateBack`

    ps：设置 delta 可以返回多级页面

- 重启：`wx.reLaunch`
- 退出

---

**组件**

- [navigator](https://developers.weixin.qq.com/miniprogram/dev/component/navigator.html)
- [functional-page-navigator](https://developers.weixin.qq.com/miniprogram/dev/component/functional-page-navigator.html)

### 路由传参

跳转时通过 url 加问号传参，page 组件通过 onLoad 回调获取对应的路由参数。

参考文献

- [wx.navigateTo](https://developers.weixin.qq.com/miniprogram/dev/api/route/wx.navigateTo.html)
- [onLoad(Object query)](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#onLoad-Object-query)

### 路由通信

```js
wx.navigateTo({
  url: 'test?id=1',
  events: {
    // 为指定事件添加一个监听器，获取被打开页面传送到当前页面的数据
    acceptDataFromOpenedPage: function(data) {
      console.log(data)
    },
    someEvent: function(data) {
      console.log(data)
    }
    ...
  },
  success: function(res) {
    // 通过eventChannel向被打开页面传送数据
    res.eventChannel.emit('acceptDataFromOpenerPage', { data: 'test' })
  }
})

//test.js
Page({
  onLoad: function(option){
    console.log(option.query)
    const eventChannel = this.getOpenerEventChannel()
    eventChannel.emit('acceptDataFromOpenedPage', {data: 'test'});
    eventChannel.emit('someEvent', {data: 'test'});
    // 监听acceptDataFromOpenerPage事件，获取上一页面通过eventChannel传送到当前页面的数据
    eventChannel.on('acceptDataFromOpenerPage', function(data) {
      console.log(data)
    })
  }
})
```

参考 [页面间通信](https://developers.weixin.qq.com/miniprogram/dev/reference/api/Page.html#%E9%A1%B5%E9%9D%A2%E9%97%B4%E9%80%9A%E4%BF%A1)

### 路由查询

[PageObject[] getCurrentPages()](https://developers.weixin.qq.com/miniprogram/dev/reference/api/getCurrentPages.html)

## 参考文献

- [页面路由](https://developers.weixin.qq.com/miniprogram/dev/framework/app-service/route.html)
