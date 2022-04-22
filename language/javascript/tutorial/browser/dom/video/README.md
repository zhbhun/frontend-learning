# 视频

## 基础

### 用法

- audioTracks：返回表示可用音轨的 AudioTrackList 对象
- autoplay：设置或返回是否在加载完成后随即播放音频/视频
- buffered：返回表示音频/视频已缓冲部分的 TimeRanges 对象

    - 兼容性：所有主流浏览器都支持 buffered 属性，Internet Explorer 8 或更早的浏览器不支持该属性。
    - 返回值

        - length - 获得音视频中已缓冲范围的数量
        - start(index) - 获得某个已缓冲范围的开始位置
        - end(index) - 获得某个已缓冲范围的结束位置

- controller：返回表示音频/视频当前媒体控制器的 MediaController 对象
- controls：设置或返回音频/视频是否显示控件（比如播放/暂停等）
- crossOrigin：设置或返回音频/视频的 CORS 设置
- currentSrc：返回当前音频/视频的 URL
- currentTime：设置或返回音频/视频中的当前播放位置（以秒计），当设置该属性时，播放会跳跃到指定的位置
- defaultMuted：设置或返回音频/视频默认是否静音
- defaultPlaybackRate：设置或返回音频/视频的默认播放速度
- duration：返回当前音频/视频的长度（以秒计）
- ended：返回音频/视频的播放是否已结束
- error：返回表示音频/视频错误状态的 MediaError 对象

    - 兼容性：只有 Internet Explorer 9 支持 error 属性。
    - 返回值：MediaError 对象的 code 属性返回一个数字值，它表示音频/视频的错误状态：

        - 1 = MEDIA_ERR_ABORTED - 取回过程被用户中止
        - 2 = MEDIA_ERR_NETWORK - 当下载时发生错误
        - 3 = MEDIA_ERR_DECODE - 当解码时发生错误
        - 4 = MEDIA_ERR_SRC_NOT_SUPPORTED - 不支持音频/视频

    - https://developer.mozilla.org/zh-CN/docs/Web/API/MediaError

- loop：设置或返回音频/视频是否应在结束时重新播放
- mediaGroup：设置或返回音频/视频所属的组合（用于连接多个音频/视频元素）
- muted：设置或返回音频/视频是否静音
- networkState：返回音频/视频的当前网络状态

    - 兼容性：所有主流浏览器都支持 networkState 属性。
    - 返回值：

        - 0 = NETWORK_EMPTY - 音频/视频尚未初始化
        - 1 = NETWORK_IDLE - 音频/视频是活动的且已选取资源，但并未使用网络
        - 2 = NETWORK_LOADING - 浏览器正在下载数据
        - 3 = NETWORK_NO_SOURCE - 未找到音频/视频来源

- paused：设置或返回音频/视频是否暂停
- playbackRate：设置或返回音频/视频播放的速度

    - 兼容性：只有 Google Chrome 和 Safari 支持 playbackRate 属性。
    - 返回值

        - 1.0 正常速度
        - 0.5 半速（更慢）
        - 2.0 倍速（更快）
        - -1.0 向后，正常速度
        - -0.5 向后，半速

- played：返回表示音频/视频已播放部分的 TimeRanges 对象，已播范围指的是被播放音频/视频的时间范围。如果用户在音频/视频中跳跃，则会获得多个播放范围。

    - 兼容性：Chrome、Safari 以及 Internet Explorer 支持 played 属性，Internet Explorer 8 或更早的浏览器不支持该属性。
    - 返回值

        - length - 获得音频/视频中已播范围的数量
        - start(index) - 获得某个已播范围的开始位置
        - end(index) - 获得某个已播范围的结束位置


- preload：设置或返回音频/视频是否应该在页面加载后进行加载
- readyState：返回音频/视频当前的就绪状态

    - 兼容性：所有主流浏览器都支持 readyState 属性，Internet Explorer 8 或更早的浏览器不支持该属性。
    - 返回值

        - 0 = HAVE_NOTHING - 没有关于音频/视频是否就绪的信息
        - 1 = HAVE_METADATA - 关于音频/视频就绪的元数据
        - 2 = HAVE_CURRENT_DATA - 关于当前播放位置的数据是可用的，但没有足够的数据来播放下一帧/毫秒
        - 3 = HAVE_FUTURE_DATA - 当前及至少下一帧的数据是可用的
        - 4 = HAVE_ENOUGH_DATA - 可用数据足以开始播放

- seekable：返回表示音频/视频可寻址部分的 TimeRanges 对象
- seeking：返回用户是否正在音频/视频中进行查找
- src：设置或返回音频/视频元素的当前来源
- startDate：返回表示当前时间偏移的 Date 对象
- textTracks：返回表示可用文本轨道的 TextTrackList 对象
- videoTracks：返回表示可用视频轨道的 VideoTrackList 对象
- volume：设置或返回音频/视频的音量

### 事件

https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events

- abort：当音频/视频的加载已放弃时
- canplay：当浏览器可以播放音频/视频时
- canplaythrough：当浏览器可在不因缓冲而停顿的情况下进行播放时

    在不需要进一步缓冲就可以播放直至文件结束时引发。

- durationchange：当音频/视频的时长已更改时

    在 onloadstart 之后和 onloadedmetadata 之前立即引发。

- emptied：当目前的播放列表为空时

    在视频对象重置为其初始状态时引发。

- ended：当目前的播放列表已结束时

    在播放结束时引发。

- error：当在音频/视频加载期间发生错误时
- loadeddata：当浏览器已加载音频/视频的当前帧时

    在当前播放位置加载媒体数据时引发。视频可以开始播放。

- loadedmetadata：当浏览器已加载音频/视频的元数据时
- loadstart：当浏览器开始查找音频/视频时

    在从站点请求视频（或音频）资源时发生此事件，并且每个请求只发生一次。

- pause：当音频/视频已暂停时
- play：当音频/视频已开始或不再暂停时
- playing：当音频/视频在已因缓冲而暂停或停止后已就绪时
- progress：当浏览器正在下载音频/视频时

    引发此事件以指示正在下载媒体内容。下载完成后停止引发。

- ratechange：当音频/视频的播放速度已更改时
- seeked：当用户已移动/跳跃到音频/视频中的新位置时
- seeking：当用户开始移动/跳跃到音频/视频中的新位置时
- stalled：当浏览器尝试获取媒体数据，但数据不可用时

    在下载被中断三秒以上时引发。这可以指示网络问题。

- suspend：当浏览器刻意不获取媒体数据时
- timgeupdate：当目前的播放位置已更改时
- volumechange：当音量已更改时
- waiting：当视频由于需要缓冲下一帧而停止

    在播放由于视频的下一帧不可用（可能需要缓冲）而停止时引发。

## 进阶

### 自动播放

TODO

### 内联播放

TODO

### 全屏播放

TODO

### 视频遮挡

### 播放控制

- iOS 下会有一个默认的播放图标

    ```css
    video::-webkit-media-controls-start-playback-button {
      display: none;
    }
    ```

- 自定义控制栏

## 资源

- 苹果测试地址

    - http://devimages.apple.com/iphone/samples/bipbop/bipbopall.m3u8
    - http://devimages.apple.com/iphone/samples/bipbop/gear3/prog_index.m3u8
    - https://devimages.apple.com.edgekey.net/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8

- 漳浦电视台

    - 漳浦综合HD：http://220.161.87.62:8800/hls/0/index.m3u8
    - 漳浦数字HD：http://220.161.87.62:8800/hls/1/index.m3u8

- 其他

    - http://www.w3school.com.cn/i/movie.mp4
    - https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8


参考文献

- [实时直播测试地址rtmp,hls](https://www.jianshu.com/p/20f9e9bb89aa)

## 参考

- [W3C video 标准](http://www.w3.org/TR/html5/embedded-content-0.html#the-video-element)
- [HTML/Elements/video](https://www.w3.org/wiki/HTML/Elements/video#Media_Events)
- [HTML 5 视频/音频参考手册](http://www.w3school.com.cn/tags/html_ref_audio_video_dom.asp)
- [使用 HTML5 视频事件](https://msdn.microsoft.com/zh-cn/library/hh924822(v=vs.85))
- [移动端HTML5<video>视频播放优化实践](http://www.xuanfengge.com/html5-video-play.html)
- [HTML5 Audio/Video 标签,属性,方法,事件汇总](http://www.cnblogs.com/luckk/p/5239991.html)
- [H5 直播避坑指南](https://mp.weixin.qq.com/s/MM5ZwCiWLAeHalsNYMImnw)
- [x5内核下video标签的使用情况](https://zzx18023.github.io/2017/09/29/x5%E5%86%85%E6%A0%B8%E4%B8%8Bvideo%E6%A0%87%E7%AD%BE%E7%9A%84%E4%BD%BF%E7%94%A8%E6%83%85%E5%86%B5/)
- [H5直播避坑指南](https://open.imtt.qq.com/forum-110-1.html)
- [视频播放--踩坑小计](https://juejin.im/post/5b189712f265da6e235488c1)
- [HTML5 Video Events and API检测工具](https://www.w3.org/2010/05/video/mediaevents.html)
- [视频事件流水查看工具](http://z.weishi.qq.com/app/video.html###)
- [How to Catch NETWORK_NO_SOURCE Errors with an HTML5 Video Tag](https://stackoverflow.com/questions/9175415/how-to-catch-network-no-source-errors-with-an-html5-video-tag)
