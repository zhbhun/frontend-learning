# 内容
- 网络图片：一般都是通过 http 或 https 协议访问的图片
- 静态图片资源：React Native 支持模块化图片，使用 `require` 或 `import` 方式使用图片
- BASE64 图片资源：图片的 BASE64 编码，一般直接放在代码里了
- 混合 App 的图片资源：打包在 App 内的图片，iOS 通过 ”Xcode asset catalogs“，Android 通过 ”drawable“ 文件夹
- 本地文件系统中的图片资源
- 多图片资源：可以给 Image 设置多个图片资源，设置相应的大小属性和缩放比例，原生代码会自动根据 Image 容器大小选择最佳的图片

Image 设置显示图片的方式

```javascript
{
  souce: {
    uri: String, // 网络图片 URL，BASE64 图片字符串，混合 App 的图片名称，本地文件系统的图片路径
    width: Number, // 宽度，也可以在样式属性里指定
    height: Number, // 高度，也可以在样式属性里指定
  },
}
```

备注：静态图片资源使用 `require` 或 `import` 直接返回类似上面的数据结构。

# 样式
- 布局

    可以将 Image 当做一个特殊的的 View 来处理，设置 flex，box，position 等相关样式，内嵌其他元素（此时作为背景图片使用），
    
    但是，除了静态图片资源自带图片大小外，其他类型的图片必须提供 Image 大小样式属性，否则不显示。

- 大小

    Image 设置了相应的宽度和高度后，不一定匹配图片的真实大小，可以使用 `resizeMode` 调整图片大小。

    - `cover`：默认值，在保持图片宽高比的前提下缩放图片，直到宽度和高度都大于等于容器视图的尺寸（如果容器有 padding 的话，则相应减去）；
    - `contain`：在保持图片宽高比的前提下缩放图片，直到宽度和高度都小于等于容器视图的尺寸（如果容器有 padding 的话，则相应减去）
    - `stretch`：拉伸图片且不维持宽高比，直到宽高都刚好填满容器
    - `repeat`：？？？
    - `center`：居中显示，缩放比例？？？

    注意点：这里的 Image 组件与 HTML 的 img 标签相差很大

- 边框

    - `borderColor`：设置边框颜色 
    - `borderWidth`：设置边框大小，不影响图片显示大小，但会遮挡图片
    - `borderRadius`：设置圆角边框，也可以单独设置某个角的 `borderRadius`：`borderBottomLeftRadius`，`borderBottomRightRadius`，`borderTopLeftRadius`，`borderTopRightRadius`

- 背景：可以针对透明图片设置背景颜色，非透明图片没效果
- 透明：`opacity` 设置图片透明度，注意颜色的透明效果
- 着色：`tintColor` 给非透明像素着色，注意观察着色效果，不要用于非透明背景的图片（正好与背景相反）
- 阴影：TODO
- 变换：TODO
- 其他

    - `backfaceVisibility`：TODO
    - `overflow`：TODO
    - `overlayColor`：TODO
    - `resizeMethod`：TODO
    - `resizeMode`：通过样式设置图片的缩放模式，优先级比属性 `resizeMode` 低

# 事件
- `onError`
- `onLayout`
- `onLoad`
- `onLoadEnd`
- `onLoadStart`
- `onPartialLoad`：iOS
- `onProgress`：iOS

疑问：如何知道图片的加载进度？

# API
- `getSize`
- `prefetch`

# 实际应用
- 图片缓存问题

    图片根据 URL 缓存，如果图片地址不变化且有缓存的话，只加载相应的缓存，不会重新下载图片。

- 尽量使用静态图片资源

    - 跨平台，不需要针对不同平台维护图片资源
    - 组件化，图片和代码可以处在同一文件夹下，还可以作为 npm 包来分发图片
    - 模块化，不需要全局命名，不用担心命名冲突了
    - 动态打包，只有实际被用到的图片才会被打包进 App
    - 动态加载，增加或修改图片不需要重新编译原生代码，只要刷新下模拟器就可以了

    备注：在 Windows 下，新增图片时需要重启 packager server

- 优化静态图片资源的平台和设备兼容性

    - 以 `ios.png` 或 `android.png` 作为图片后缀命名，实现不同平台加载不同的图片
    - 以 `@2x.png` 或 `@3x.png` 作为图片后缀命名，实现不同分辨率的设备加载不同的图片

    备注：针对以上命名方式，在使用 `require` 引入图片时只要填写图片名称即可。

- 使用 `require` 引入静态图片资源时，命名必须是静态的

    ```
    // 正确
    <Image source={require('./my-icon.png')} />

    // 错误
    var icon = this.props.active ? 'my-icon-active' : 'my-icon-inactive';
    <Image source={require('./' + icon + '.png')} />

    // 正确
    var icon = this.props.active ? require('./my-icon-active.png') : require('./my-icon-inactive.png');
    <Image source={icon} />
    ```

- TODO：实现动态缩放静态资源图片时（例如，使用 flex），需要手动设置 `{ width: undefined, height: undefined }`

# 参考文献
- [Image Guide](http://facebook.github.io/react-native/docs/images.html)
- [Image Component Document](http://facebook.github.io/react-native/docs/image.html)

# TODO
- 缓存策略：目前 Image 组件根据 url 来缓存图片（是个 bug 暂时没有被处理掉）

    - [Cache never expires for the same uri](https://github.com/facebook/react-native/issues/1397)
    - [Image in ListView is not updated when re-rendering](https://github.com/facebook/react-native/issues/1417)
    - [Initial PoC implementation of cache policy for images](https://github.com/facebook/react-native/pull/1491)

- [How would you implement pinch-zoom in react-native?](http://stackoverflow.com/questions/31628663/how-would-you-implement-pinch-zoom-in-react-native)
- [Scrollable image with pinch-to-zoom](http://stackoverflow.com/questions/36368919/scrollable-image-with-pinch-to-zoom)
