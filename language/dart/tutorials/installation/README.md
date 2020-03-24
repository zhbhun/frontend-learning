# 安装

Dart SDK 提供了基本的库和命令行工具，用于开发 Web 应用、命令行工具和服务端应用。如果只是开发移动端应用，那么你只需要按照 Flutter SDK，而不需要再安装 Dart SDK（Flutter SDK 内置了 Dart SDK）。Dart SDK 的安装方式有三种：

1. 包管理工具（推荐）
2. [自行构建源码](https://github.com/dart-lang/sdk/wiki/Building)
3. [下载安装预编译好的 SDK](https://dart.dev/tools/sdk/archive)

由于使用操作系统支持的包管理工具进行安装较为简单，所以通常推荐采用这种方式。

- Window

    ```bash
    # stable
    $ choco install dart-sdk
    # dev
    $ choco install dart-sdk --pre
    # upgrade
    $ choco upgrade dart-sdk
    ```

- Linux

    ```bash
    # prepare
    $ sudo apt-get update
    $ sudo apt-get install apt-transport-https
    $ sudo sh -c 'wget -qO- https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -'
    # stable
    $ sudo sh -c 'wget -qO- https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_stable.list > /etc/apt/sources.list.d/dart_stable.list'
    $ sudo apt-get update
    $ sudo apt-get install dart
    # dev
    $ sudo sh -c 'wget -qO- https://storage.googleapis.com/download.dartlang.org/linux/debian/dart_unstable.list > /etc/apt/sources.list.d/dart_unstable.list'
    $ sudo apt-get update
    $ sudo apt-get install dart
    # auto upgrae
    ```

- mac

    ```bash
    # stable
    $ brew tap dart-lang/dart
    $ brew install dart
    # dev
    $ brew install dart -- --devel
    # upgrade
    $ brew upgrade dart
    ```

检查是否安装成功

```bash
$ dart --version
```

编写 "Hello World"

```dart
void main() {
  print('Hello World!');
}
```

运行第一个 dart 程序

```dart
dart ./main.dart
```

## 在线编辑器

Dart 提供了在线编辑器 [DartPad](https://dartpad.dev/) 来快速上手和体验 Dart。

## 参考文献

- [Get the Dart SDK](https://dart.dev/get-dart)
