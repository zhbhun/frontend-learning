Canvas 图片跨域问题
========

尽管不通过 CORS 就可以在 Canvas 画布中使用图片，但是这会污染画布。一旦画布被污染，你就无法读取其数据。例如，你不能再使用画布的 toBlob(), toDataURL() 或 getImageData() 方法，调用它们会抛出安全错误。这种机制可以避免未经许可拉取远程网站信息而导致的用户隐私泄露。

HTML 规范中图片有一个 crossorigin 属性，结合合适的 CORS 响应头，就可以实现在画布中使用跨域 `<img>` 元素的图像。

| crossOrigin/CORS | 同域 | 跨域无 CORS | 跨域有 CORS |
| --- | --- | --- | --- |
| default | 支持 | 支持渲染，不支持 `toDataURL` | 支持渲染，不支持 `toDataURL` |
| anonymous | N/A | 同上 | 支持渲染，支持 `toDataURL` |
| use-credentials | N/A | 同上 | 支持渲染，不支持 `toDataURL` |

总结：Canvas 可以正常的渲染跨域图片，但是在跨域图片没有设置跨域响应头或没有设置 `crossOrigin = 'anonymous'` 的时候，使用 `canvas.toDataURl` 会抛出如下错误：

- Chrome

    没有设置 `crossOrigin`

    ```
    Uncaught DOMException: Failed to execute 'toDataURL' on 'HTMLCanvasElement': Tainted canvases may not be exported.
    at Image.img.onload...
    ```

    跨域

    ```
    Access to Image at 'http://localhost:3001/canvas.jpg' from origin 'http://localhost:3000' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource. Origin 'http://localhost:3000' is therefore not allowed access.
    ```

    设置了 `crossOrigin=use-credentials`

    ```
    Access to Image at 'http://localhost:3002/canvas.jpg' from origin 'http://localhost:3000' has been blocked by CORS policy: The value of the 'Access-Control-Allow-Origin' header in the response must not be the wildcard '*' when the request's credentials mode is 'include'. Origin 'http://localhost:3000' is therefore not allowed access.
    ```

- Safari/Firefox

    没有设置 `crossOrigin`

    `SecurityError: The operation is insecure.`

    跨域

    ```
    [Error] Origin http://192.168.3.99:3000 is not allowed by Access-Control-Allow-Origin.
    [Error] Failed to load resource: Origin http://192.168.3.99:3000 is not allowed by Access-Control-Allow-Origin. (canvas.jpg, line 0)
    [Error] Cross-origin image load denied by Cross-Origin Resource Sharing policy.
    ```
    
    设置了 `corssOrigin=use-credentials`

    ```
    [Error] Cannot use wildcard in Access-Control-Allow-Origin when credentials flag is true.
    [Error] Failed to load resource: Cannot use wildcard in Access-Control-Allow-Origin when credentials flag is true. (canvas.jpg, line 0)
    [Error] Cross-origin image load denied by Cross-Origin Resource Sharing policy.
    ```

## [测试示例](./package.json)

1. 启动服务器

    - `npm start`：启动服务器
    - `npm run start:corsdisable`：启动跨域图片服务器
    - `npm run start:corsable`：启动跨域-CORS图片服务器

2. 访问 http://localhost:3000

## 其他问题

1. cossOrigin 存在兼容性问题？

    对于不支持 `cossOrigin` 的浏览器（IE 10及以下版本不支持，Android 4.3 及以下版本不支持）可以使用 `XMLHttprequest` 和 `URL.createObjectURL()` 来做兼容，参考测试示例 [Ajax 解决 Canvas 图片跨域问题](./ajax.html)。

2. 为什么不使用同域图片？

    现在的前端开发一般都是将静态资源放置到 CDN 上，例如：阿里云或者腾讯云服务，并且会有一个专门的域名来访问这些资源。

## 参考文献

- [Cross-Origin Resource Sharing](https://caniuse.com/#feat=cors)
- [The crossOrigin attribute: Requesting CORS access to content](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_settings_attributes)
- [Allowing cross-origin use of images and canvas](https://developer.mozilla.org/en-US/docs/Web/HTML/CORS_enabled_image)
- [解决canvas图片getImageData,toDataURL跨域问题](https://www.zhangxinxu.com/wordpress/2018/02/crossorigin-canvas-getimagedata-cors/)
- [Drawing images to canvas with img.crossOrigin = “Anonymous” doesn't work](https://stackoverflow.com/questions/23123237/drawing-images-to-canvas-with-img-crossorigin-anonymous-doesnt-work)
- [Cross Domain Images and the Tainted Canvas](https://blog.codepen.io/2013/10/08/cross-domain-images-tainted-canvas/)
