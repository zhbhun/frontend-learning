# 二进制数据

## 基础

### 数据类型

### [Blob](https://developer.mozilla.org/zh-CN/docs/Web/API/Blob)

> Blob 对象表示一个不可变、原始数据的**类文件对象**。它的数据可以按文本或二进制的格式进行读取，也可以转换成 ReadableStream 来用于数据操作。 

### [ArrayBuffer](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer)

> ArrayBuffer 对象用来表示通用的、固定长度的原始**二进制数据缓冲区**。

### 类型转换

### Blob 和 ArrayBuffer 区别和相互转换

Blob 类型只有 slice 方法，用于返回一个新的 Blob对象，包含了源 Blob 对象中指定范围内的数据。对比发现，ArrayBuffer 的数据，是可以按照字节去操作的，而 Blob 的只能作为一个整的对象去处理。所以说，ArrayBuffer 相比 Blob 更接近真实的二进制，更底层。

- ArrayBuffer to Blob

    ```js
    var buffer = new ArrayBuffer(16);
    var blob = new Blob([buffer]);
    ```

- Blob to ArrayBuffer

    ```js
    var blob = new Blob([1,2,3,4,5]);
    blob.arrayBuffer().then(buffer => /* 处理 ArrayBuffer 数据的代码……*/);
    ```

参考文献

- [js中arraybuffer与blob的区别](https://www.zhuyuntao.cn/js%E4%B8%ADarraybuffer%E4%B8%8Eblob%E7%9A%84%E5%8C%BA%E5%88%AB)

### 读写流

- [ReadableStream](https://developer.mozilla.org/zh-CN/docs/Web/API/ReadableStream)

## 进阶

### 文本编码和解码

- [TextDecoder 和 TextEncoder](https://zh.javascript.info/text-decoder)

### 文件 hash

- [js 如何快速计算出文件hash值](https://juejin.cn/post/6932299991012769806)

## 参考文献

- [二进制数组](https://javascript.ruanyifeng.com/stdlib/arraybuffer.html)
- [ArrayBuffer 对象，Blob 对象](https://wangdoc.com/javascript/bom/arraybuffer.html)
- [二进制数据，文件 —— 现代 JavaScript 教程](https://zh.javascript.info/binary)
- [Typed Arrays: Binary Data in the Browser](https://www.html5rocks.com/en/tutorials/webgl/typed_arrays/)
- [TypeArray、ArrayBuffer、Blob的相互转换](http://shihuacivis.github.io/2015/12/29/20151229_arrayBuffer/)
- [HTML5 Blob与ArrayBuffer、TypeArray和字符串String之间转换](https://www.cnblogs.com/tianma3798/p/5834598.html)
- [在canvas中使用二进制](https://www.zhuyuntao.cn/%E5%9C%A8canvas%E4%B8%AD%E4%BD%BF%E7%94%A8%E4%BA%8C%E8%BF%9B%E5%88%B6)
- [前端二进制学习（一）](https://www.zhuyuntao.cn/%E5%89%8D%E7%AB%AF%E4%BA%8C%E8%BF%9B%E5%88%B6%E5%AD%A6%E4%B9%A0%EF%BC%88%E4%B8%80%EF%BC%89)
- [前端二进制学习（二）](https://www.zhuyuntao.cn/%E5%89%8D%E7%AB%AF%E4%BA%8C%E8%BF%9B%E5%88%B6%E5%AD%A6%E4%B9%A0%EF%BC%88%E4%BA%8C%EF%BC%89)
- [前端二进制学习（三）](https://www.zhuyuntao.cn/%E5%89%8D%E7%AB%AF%E4%BA%8C%E8%BF%9B%E5%88%B6%E5%AD%A6%E4%B9%A0%EF%BC%88%E4%B8%89%EF%BC%89)
- [【前端知乎系列】ArrayBuffer 与 Blob对象](https://juejin.cn/post/6844904022206332941)
- [谈谈JS二进制：File、Blob、FileReader、ArrayBuffer、Base64](https://zhuanlan.zhihu.com/p/568915443)
