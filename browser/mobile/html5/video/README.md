- [H5 直播避坑指南](https://mp.weixin.qq.com/s/MM5ZwCiWLAeHalsNYMImnw)

# 常见问题
- X5 内核相关问题

    - X5 内核播放器在全屏播放状态下会提供分享按钮

        - 如果网页地址存在敏感信息，可能会被分享出去
        - 分享出去的地址不友好

    - X5 内核播放器在全屏播放状态下可能存在广告

        - 推荐下载 QQ 浏览器

- 区分 `video`, `object`, `embed`

    - embed

        - HTML4 无法识别 <embed> 标签。您的页面无法通过验证。
        - 如果浏览器不支持 Flash，那么视频将无法播放
        - iPad 和 iPhone 不能显示 Flash 视频。
        - 如果您将视频转换为其他格式，那么它仍然不能在所有浏览器中播放

    - object

        - 如果浏览器不支持 Flash，将无法播放视频
        - iPad 和 iPhone 不能显示 Flash 视频。
        - 如果您将视频转换为其他格式，那么它仍然不能在所有浏览器中播放。

    - video

        - 您必须把视频转换为很多不同的格式。
        - <video> 元素在老式浏览器中无效。

    - 参考: http://www.runoob.com/html/html-videos.html

