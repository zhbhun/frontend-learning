// pages/apis/open-api/index.js
Page({
  onReady() {
    // const query = wx.createSelectorQuery()
    // query.select('#videoCanvas')
    //   .fields({
    //     node: true,
    //     size: true
    //   })
    //   .exec((res) => {
    //     const canvas = res[0].node
    //     const ctx = canvas.getContext('2d')

    //     const dpr = wx.getSystemInfoSync().pixelRatio
    //     canvas.width = res[0].width * dpr
    //     canvas.height = res[0].height * dpr
    //     ctx.scale(dpr, dpr)

    //     ctx.fillRect(0, 0, 100, 100)
    //     this.canvas = canvas
    //   })
  },
  handleTap() {
    const arr = new Uint8ClampedArray(40000);
    // Iterate through every pixel
    // for (let i = 0; i < arr.length; i += 4) {
    //   arr[i + 0] = 255; // R value
    //   arr[i + 1] = 0; // G value
    //   arr[i + 2] = 0; // B value
    //   arr[i + 3] = 255; // A value
    // }

    // wx.canvasPutImageData({
    //   canvasId: 'videoCanvas',
    //   x: 0,
    //   y: 0,
    //   width: 100,
    //   height: 100,
    //   data: arr,
    //   success(res) {
    //     console.log('>> canvasPutImageData', res)
    //   },
    //   fail(error) {
    //     console.log('>> canvasPutImageData', error)
    //   }
    // })
    console.log('tap')
    const videDecoder = wx.createVideoDecoder()
    videDecoder.on('start', () => {
      setTimeout(() => {
        const frameData = videDecoder.getFrameData()
        console.log('>> getFrameData', frameData)
        wx.canvasPutImageData({
          canvasId: 'videoCanvas',
          x: 0,
          y: 0,
          width: 320,
          height: 176,
          data: new Uint8ClampedArray(frameData.data),
          success(res) {
            console.log('>> canvasPutImageData', res)
          },
          fail(error) {
            console.log('>> canvasPutImageData', error)
          }
        })
      }, 1000)
    })
    // videDecoder.on('bufferchange', () => {
    //   const data = videDecoder.getFrameData()
    //   console.log('4', data)
    // })
    videDecoder.start({
      // source: 'http://192.168.102.6:3000/video.mp4',
      source: 'http://220.161.87.62:8800/hls/0/index.m3u8',
      abortAudio: true,
    }).then((...args) => {
      console.log('>> start then', args)
    }).catch((error) => {
      console.log('>> start catch', error, error.message, error.stack)
    })
  }
})
