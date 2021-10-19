Page({
  data: {
    visible: true
  },
  switch () {
    this.setData({
      visible: !this.data.visible
    })
  }
})
