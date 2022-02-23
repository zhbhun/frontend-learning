/**
 * 测试 globalData 是否是响应式的
 */
const app = getApp()

Page({
  data: {
    globalData: app.globalData
  },
})