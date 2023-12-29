## 原理

### Controller

- [BaseCroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/BaseCroppableImageController-class.html)
- [CroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/CroppableImageController-class.html)
- [CupertinoCroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/CupertinoCroppableImageController-class.html)
- [MaterialCroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/MaterialCroppableImageController-class.html)

---


- CroppableImageController

  - viewportScale：是图像分辨率和裁剪框大小之间的比例

- CroppableImageData

  - imageSize：图片分辨率信息
  - cropRect：裁剪框大小（根据裁剪框和图片分辨率计算出来的），用来实现移动和大小缩放
  - cropShape：裁减形状
  - baseTransformations：基础变换

    - 旋转：
    - 缩放：用来实现横向翻转

  - imageTransform：图像变换
  - currentImageTransform：当前图像变换

### Animation

- [CroppableImagePageAnimator](https://pub.dev/documentation/croppy/latest/croppy/CroppableImagePageAnimator-class.html)：裁减页面展开动画，可配合 Hero 使用

### Widget

#### 控制提供器

- [DefaultCupertinoCroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/DefaultCupertinoCroppableImageController-class.html)
- [DefaultMaterialCroppableImageController](https://pub.dev/documentation/croppy/latest/croppy/DefaultMaterialCroppableImageController-class.html)

#### 容器

- [CroppableImageViewport](https://pub.dev/documentation/croppy/latest/croppy/CroppableImageViewport-class.html)
- [AnimatedCroppableImageViewport](https://pub.dev/documentation/croppy/latest/croppy/AnimatedCroppableImageViewport-class.html)

#### 图片

- [CroppableImageWidget](https://pub.dev/documentation/croppy/latest/croppy/CroppableImageWidget-class.html)

#### 手柄

- [MaterialImageCropperHandles](https://pub.dev/documentation/croppy/latest/croppy/MaterialImageCropperHandles-class.html)
- [CupertinoImageCropHandles](https://pub.dev/documentation/croppy/latest/croppy/croppy-library.html)
