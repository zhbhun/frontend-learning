Component({
  /**
   * 组件的初始数据
   */
  data: {
    events: []
  },

  /**
   * 组件的声明周期
   */
  lifetimes: {
    created() {
      console.log('>> component created')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'created'
        }])
      })
    },
    // 在组件实例进入页面节点树时执行
    attached() {
      console.log('>> component attached')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'attached'
        }])
      })
    },
    ready() {
      console.log('>> component ready')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'ready'
        }])
      })
    },
    moved() {
      console.log('>> component moved')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'moved'
        }])
      })
    },
    // 在组件实例被从页面节点树移除时执行
    detached() {
      console.log('>> component detached')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'detached'
        }])
      })
    },
    error() {
      console.log('>> component error')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'error'
        }])
      })
    },
  },

  pageLifetimes: {
    show() {
      console.log('>> component show')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'show'
        }])
      })
    },
    hide() {
      console.log('>> component hide')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'hide'
        }])
      })
    },
    resize() {
      console.log('>> component resize')
      this.setData({
        events: this.data.events.concat([{
          ts: Date.now(),
          event: 'resize'
        }])
      })
    },
  }
})
