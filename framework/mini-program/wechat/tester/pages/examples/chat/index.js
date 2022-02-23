// pages/example/chat/index.js

/**
 * @type ListItem
 * @property {number} type 1|文本;2|图片;3|视频;4|语音
 * @property {string} content
 * @property {number} duration 
 * @property {number} size
 */

Page({

  /**
   * 页面的初始数据
   */
  data: {
    recorderVisible: false,
    recording: false,
    data: [],
    // ---
    system: {},
    systemText: '',
    keyboard: {
      width: 0,
      height: 0,
    },
    list: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.recorderManager = wx.getRecorderManager();
    this.recorderManager.onStop((res) => {
      this.setData({
        data: [
          ...this.data.data,
          {
            type: 4,
            content: res.tempFilePath,
            duration: res.duration,
            size: res.fileSize
          }
        ]
      })
      console.log(res);
    });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    const system = wx.getSystemInfoSync();
    const list = [];
    for (let index = 0; index < 100; index++) {
      list.push(index);
    }
    this.setData({
      system,
      systemText: JSON.stringify(system),
      list,
      bottom: 0,
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {},

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },
  onVoicePlay: function (event) {
    const item = this.data.data[event.target.dataset.index];
    const innerAudioContext = wx.createInnerAudioContext()
    innerAudioContext.autoplay = false;
    innerAudioContext.src = item.content;
    innerAudioContext.onPlay(() => {
      console.log('开始播放')
    });
    innerAudioContext.onError((res) => {
      console.log(res.errMsg)
      console.log(res.errCode)
    });
    innerAudioContext.play();
  },
  onRecorderSwitch: function () {
    this.setData({
      recorderVisible: !this.data.recorderVisible
    });
  },
  onRecorderStart: function () {
    this.setData({
      recording: true
    });
    const options = {
      duration: 10000,
      sampleRate: 44100,
      numberOfChannels: 1,
      encodeBitRate: 192000,
      format: 'aac',
      frameSize: 50
    };
    this.recorderManager.start(options);
  },
  onRecorderStop: function () {
    this.setData({
      recording: false
    });
    this.recorderManager.stop();
  },
  onVideoChoose: function () {
    wx.chooseVideo({
      success: function (res) {
        console.log(res);
      }
    });
  },
  onBlur: function () {
    this.setData({
      keyboard: {
        ...this.data.keyboard,
        height: 0,
      },
      bottom: 0
    })
  },
  onKeyboardHeightChange: function (event) {
    this.setData({
      keyboard: {
        ...this.data.keyboard,
        height: event.detail.height
      },
      bottom: event.detail.height
    });
  }
})
