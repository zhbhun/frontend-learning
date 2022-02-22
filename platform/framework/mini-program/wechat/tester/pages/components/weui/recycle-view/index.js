const createRecycleContext = require('miniprogram-recycle-view')

// fakeList

const imgUrlList = [
  'http://mmbiz.qpic.cn/sz_mmbiz_jpg/GEWVeJPFkSEV5QjxLDJaL6ibHLSZ02TIcve0ocPXrdTVqGGbqAmh5Mw9V7504dlEiatSvnyibibHCrVQO2GEYsJicPA/0?wx_fmt=jpeg',
  'http://mmbiz.qpic.cn/sz_mmbiz_png/GEWVeJPFkSHALb0g5rCc4Jf5IqDfdwhWJ43I1IvriaV5uFr9fLAuv3uxHR7DQstbIxhNXFoQEcxGzWwzQUDBd6Q/0?wx_fmt=png',
  'http://mmbiz.qpic.cn/sz_mmbiz_jpg/GEWVeJPFkSGqys4ibO2a8L9nnIgH0ibjNXfbicNbZQQYfxxUpmicQglAEYQ2btVXjOhY9gRtSTCxKvAlKFek7sRUFA/0?wx_fmt=jpeg',
  'http://mmbiz.qpic.cn/sz_mmbiz_jpg/GEWVeJPFkSH2Eic4Lt0HkZeEN08pWXTticVRgyNGgBVHMJwMtRhmB0hE4m4alSuwsBk3uBBOhdCr91bZlSFbYhFg/0?wx_fmt=jpeg',
  'http://mmbiz.qpic.cn/mmbiz_jpg/TcDuyasB5T3Eg34AYwjMw7xbEK2n01ekiaicPiaMInEMTkOQtuv1yke5KziaYF4MLia4IAbxlm0m5NxkibicFg4IZ92EA/0?wx_fmt=jpeg',
]

const newList = new Array(300).fill(0)
let count = 0;
for (let i = 0; i < newList.length; i++) {
  newList[i] = {
    idx: i,
    title: `${i}、文本`,
    image_url: imgUrlList[(count++) % 5],
  }
}

const rpx2px = (rpx) => (rpx / 750) * wx.getSystemInfoSync().windowWidth
Page({
  onShareAppMessage() {
    return {
      title: 'recycle-view',
      path: 'page/weui/example/recycle-view/recycle-view'
    }
  },
  data: {
    
  },
  onLoad(options) {

  },
  onReady() {
    const ctx = createRecycleContext({
      id: 'recycleId',
      dataKey: 'recycleList',
      page: this,
      itemSize: {
        height: rpx2px(300),
        width: rpx2px(750)
      }
    })
    ctx.append(newList)
  },

})
