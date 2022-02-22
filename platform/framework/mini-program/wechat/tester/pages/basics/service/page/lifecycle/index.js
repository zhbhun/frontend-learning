// pages/basics/lifecycle/index.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    events: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('>> page onLoad', options)
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onLoad'
      }])
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    console.log('>> page onReady')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onReady'
      }])
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    console.log('>> page onShow')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onShow'
      }])
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.log('>> page onHide')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onHide'
      }])
    })
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log('>> page onUnload')
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log('>> page onPullDownRefresh')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onPullDownRefresh'
      }])
    })
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log('>> page onReachBottom')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onReachBottom'
      }])
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    console.log('>> page onShareAppMessage')
    this.setData({
      events: this.data.events.concat([{
        ts: Date.now(),
        event: 'onShareAppMessage'
      }])
    })
  }
})
