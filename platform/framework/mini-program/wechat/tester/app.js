//app.js
App({
  globalData: {
    now: Date.now(),
  },
  onLaunch(options) {
    console.log('>> app onLaunch', Date.now(), options)
    setInterval(() => {
      this.globalData.now = Date.now()
    }, 1000)
  },
  onShow(options) {
    console.log('>> app onShow', Date.now(), options)
  },
  onHide(options) {
    console.log('>> app onHide', Date.now(), options)
  },
  onError(msg) {
    console.log('>> app onError', Date.now(), msg)
  }
})