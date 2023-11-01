- [intl](https://github.com/dart-lang/i18n/tree/main/pkgs/intl)
- [flutter_localizations](https://github.com/channdara/flutter_localization)

## 使用

### `flutter gen-l10n`

flutter 自带根据多语言配置文件 arb 生成 dart 代码的功能，但是这种方案无法使用 `Intl.message` 的功能。

参考

- [Internationalizing Flutter apps](https://docs.flutter.dev/ui/accessibility-and-internationalization/internationalization)
- [Flutter gen_l10n example](https://github.com/localizely/flutter-gen-l10n-example)
- https://github.com/flutter/website/tree/main/examples/internationalization

### `Flutter Intl Tool`

1. 使用编辑器提供的插件来生成多语言代码，这种方案是支持  `Intl.message` 的功能。

  - [Flutter Intl - Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=localizely.flutter-intl)
  - [Flutter Intl - IntelliJ IDEs Plugin](https://plugins.jetbrains.com/plugin/13666-flutter-intl)

  ps: 也可以使用 [intl_utils](https://pub.dev/packages/intl_utils) 手动生成。

2. 使用 [intl_translation](https://github.com/dart-lang/i18n/blob/main/pkgs/intl_translation/README.md) 从代码里提取多语言字段到 arb 文件中。

## 参考文献

- [2023了，如何快速实现 Flutter 国际化](https://juejin.cn/post/7192758172153561147)
- [Flutter实现国际化](https://developer.aliyun.com/article/978858)
- [Flutter International 国际化，Localization 本地化， 使用Intl](https://cloud.tencent.com/developer/article/1783074)
