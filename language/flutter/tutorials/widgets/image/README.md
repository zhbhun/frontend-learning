# Image

- [ui:Image](https://api.flutter.dev/flutter/dart-ui/Image-class.html)
- [widgets:RawImage](https://api.flutter.dev/flutter/widgets/RawImage-class.html)
- [widgets:Image](https://api.flutter.dev/flutter/widgets/Image-class.html)

## Usage

### 获取图片信息

- [loadImage](https://api.flutter.dev/flutter/painting/ImageProvider/loadImage.html)

```dart
Future<ui.Image> obtainImage(ImageProvider provider) {
  final completer = Completer<ui.Image>();

  provider
      .resolve(ImageConfiguration.empty)
      .addListener(ImageStreamListener((ImageInfo info, bool _) {
    completer.complete(info.image);
  }));

  return completer.future;
}
```
