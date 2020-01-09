# [Dart](https://dart.dev)

- [Document](https://dart.dev/guides)
- [Blog](https://medium.com/dartlang)
- APIs

    - [2.1.0](https://api.dartlang.org/stable/2.1.0/index.html)

- [Pub](https://pub.dev)
- [Community](https://dart.dev/community)

    - [Dart China](https://www.dart-china.org/)

- [语言设计](https://github.com/dart-lang/language)

语言特性

- Optimized for UI

    > Develop with a programming language specialized around the needs of user interface creation

- Productive development

    > Make changes iteratively: use hot reload to see the result instantly in your running app

- Fast on all platforms

    > Compile to ARM & x64 machine code for mobile, desktop, and backend. Or compile to JavaScript for the web

可以用来做什么？

1. 客户端应用

    移动端、桌面端、Web 端

2. 服务端应用
3. 命令行应用

## 安装使用

- [Get the Dart SDK](https://dart.dev/get-dart)
- [Try Dart](https://dart.dev/#try-dart)
- [Bootstrap into Dart](https://flutter.dev/docs/resources/bootstrap-into-dart)

## 语言详解

- [A tour of the Dart language](https://dart.dev/guides/language/language-tour)
- [Language samples](https://dart.dev/samples)
- [Codelabs](https://dart.dev/codelabs)
- [Dart cheatsheet codelab](https://dart.dev/codelabs/dart-cheatsheet)
- [Dart language specification](https://dart.dev/guides/language/spec)

### 关键字

[Keywords](https://www.dartlang.org/guides/language/language-tour#keywords)

### 变量

[Variables](https://www.dartlang.org/guides/language/language-tour#variables)

### 类型

- [Built-in types](https://www.dartlang.org/guides/language/language-tour#built-in-types)
- [Dart's Type System](https://www.dartlang.org/guides/language/sound-dart)
- [Typedefs](https://dart.dev/guides/language/language-tour#typedefs)

### 操作符 & 表达式

[Operators](https://www.dartlang.org/guides/language/language-tour#operators)

### 语句

[Control flow statements](https://www.dartlang.org/guides/language/language-tour#control-flow-statements)

#### 异常

[Exceptions](https://www.dartlang.org/guides/language/language-tour#exceptions)

### 函数

- [Functions](https://www.dartlang.org/guides/language/language-tour#functions)
- [Typedefs](https://dart.dev/guides/language/language-tour#typedefs)

### 类

- [Classes](https://www.dartlang.org/guides/language/language-tour#classes)
- [Callable classes](https://dart.dev/guides/language/language-tour#callable-classes)

参考文献

- [【译】Dart | 什么是Mixin](https://juejin.im/post/5bb204d3e51d450e4f38e2f6)

### 泛型

[Generics](https://www.dartlang.org/guides/language/language-tour#generics)

### 注解

- [Metadata](https://dart.dev/guides/language/language-tour#metadata)

### 注释

- [Comments](https://dart.dev/guides/language/language-tour#comments)

### [模块](https://dart.dev/guides/language/language-tour#libraries-and-visibility)

- [How to use packages](https://dart.dev/guides/packages)
- [Commonly used packages](https://dart.dev/guides/libraries/useful-libraries)
- [Creating packages](https://dart.dev/guides/libraries/create-library-packages)
- [Publishing packages](https://dart.dev/tools/pub/publishing)

## 工作机制

- [Isolates](https://dart.dev/guides/language/language-tour#isolates)

## 使用教程

- [Tutorials](https://dart.dev/tutorials)

### 异步编程

- [Asynchronous programming: futures, async, await](https://dart.dev/codelabs/async-await)
- [Asynchronous programming: streams](https://dart.dev/tutorials/language/streams)

### 引用公共库


#### 核心库

- [Core libraries](https://dart.dev/guides/libraries)
- [A tour of the core libraries](https://dart.dev/guides/libraries/library-tour)

#### 第三方库

- [Install shared packages](https://dart.dev/tutorials/libraries/shared-pkgs)

#### 自定义

TODO

### 开发工具

- https://dartpad.dartlang.org/
- [IDEs and editors](https://dart.dev/tools#ides-and-editors)
- https://github.com/dart-lang/dartdoc#dartdoc
- https://github.com/dart-lang/linter
- [The pub tool](https://dart.dev/tools/pub/cmd)

---

- [Customizing static analysis](https://dart.dev/guides/language/analysis-options)

### 应用开发

#### 客户端应用

- Web 应用

    - [Web apps tutorial](https://dart.dev/tutorials#web-apps)
    - [Web apps overview](https://dart.dev/web)
    - [Tools for developing web apps](https://dart.dev/tools#web)

- 移动端应用
- 说明应用

##### 状态管理

- [flutter_redux](https://github.com/brianegan/flutter_redux)
- [flutter-provide](https://github.com/google/flutter-provide)
- [scoped_model](https://github.com/brianegan/scoped_model)

---

- [Flutter | 状态管理探索篇——Scoped Model（一）](https://juejin.im/post/5b97fa0d5188255c5546dcf8)
- [Flutter | 状态管理探索篇——Redux（二）](https://www.jianshu.com/p/5d7e2dbdaea5)
- [八种 Flutter 状态管理-深入评论](https://zhuanlan.zhihu.com/p/65395502)
- [Flutter状态管理 - 初探与总结](https://juejin.im/post/5cd91bb0f265da034e7eaca3)

#### 命令行程序

- [Write command-line apps](https://dart.dev/tutorials/server/cmdline)

#### 服务端应用

- [Server-side Dart tutorials](https://dart.dev/tutorials#server-side-dart-tutorials)
- [Write HTTP clients & servers](https://dart.dev/tutorials/server/httpserver)
- [Tools for developing command-line apps and servers](https://dart.dev/tools#server)

### 编码规范

- [Effective Dart](https://dart.dev/guides/language/effective-dart)

## 常见问题

### 如何将 Map 对象传给函数的命名参数

```dart
main() {
  print('Hello, World!');
  final a = new Map<Symbol, dynamic>();
  a[const Symbol('m')] = 'string';
  a[const Symbol('n')] = 1;
  Function.apply(slave, [], a);
}

void slave({String m, int n}) {
  print(m);
  print(n);
}
```

- [Dart - named parameters using a Map](https://stackoverflow.com/questions/16688054/dart-named-parameters-using-a-map)
