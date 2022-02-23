// pages/apis/wxml/intersection-observer/child.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  lifetimes: {
    attached() {
      const io = this.createIntersectionObserver({
        observeAll: true,
      })
      io.relativeToViewport()
      io.observe('.p', (res) => {
        console.log('>> child', res, res.id, res.dataset)
      })
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
