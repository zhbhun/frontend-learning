
1. 选择正确的图片格式
2. 选择恰当的压缩比例
3. 使用响应式图片（格式和分辨率）
4. 使用 CDN 加速
5. 懒加载和加载优先级

## 压缩工具

- https://tinypng.com/
- [imagemin](https://github.com/imagemin/imagemin)
- [ImageOptim](https://imageoptim.com/mac)

## 懒加载

- [现代图片性能优化及体验优化指南 - 懒加载及异步图像解码方案](https://zhuanlan.zhihu.com/p/610012610)

## 渐进式加载

- [图片渐进式加载的实现方法](https://akarin.dev/2021/11/04/progressive-image-loading/)

    - [blurhash](https://github.com/woltapp/blurhash) - A very compact representation of a placeholder for an image.

        这个工具可以提取图片的颜色分布，生成一个哈希字符串。网页就可以用这个哈希，生成图片的模糊缩略图。

    - [primitive](https://github.com/fogleman/primitive) - Reproducing images with geometric primitives.

        可以用数百个椭圆、矩形、三角形等简单的图形对图片进行拟合，还支持以 SVG 的矢量格式输出

- [The “Blur Up” Technique for Loading Background Images](https://css-tricks.com/the-blur-up-technique-for-loading-background-images/)
- [CSS blur and retain sharp edges using absolute div](https://stackoverflow.com/questions/20443283/css-blur-and-retain-sharp-edges-using-absolute-div#answer-48095387)

## 参考文献

- [Best practices for images](https://github.com/nucliweb/image-element)
- [渐进式jpeg(progressive jpeg)图片及其相关](https://www.zhangxinxu.com/wordpress/2013/01/progressive-jpeg-image-and-so-on/)
- [Choose the right image format](https://web.dev/choose-the-right-image-format/)
- [Choose the correct level of compression](https://web.dev/compress-images/)
- [Use Imagemin to compress images](https://web.dev/use-imagemin-to-compress-images/)
- [Replace animated GIFs with video for faster page loads](https://web.dev/replace-gifs-with-videos/)
- [Serve responsive images](https://web.dev/serve-responsive-images/)
- [Serve images with correct dimensions](https://web.dev/serve-images-with-correct-dimensions/)
- [Use WebP images](https://web.dev/serve-images-webp/)
- [Use image CDNs to optimize images](https://web.dev/image-cdns/)
