// pages/apis/wxml/intersection-observer/inner-scroll.js
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
      // const io = this.createIntersectionObserver({
      //   observeAll: true,
      // })
      // io.relativeToViewport()
      // io.observe('.p', (res) => {
      //   console.log('>> inner-scroll', res, res.id, res.dataset)
      // })
      const io1 = this.createIntersectionObserver({
        observeAll: true,
      })
      io1.relativeTo('.scroll')
      io1.observe('.p', (res) => {
        console.log('>> inner-scroll1', res, res.id, res.dataset)
      })
      console.log(this)
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {

  }
})
