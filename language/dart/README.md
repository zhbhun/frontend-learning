# [Dart](https://dart.dev)

## Syntax

### Variable

- var
- final
- const

  - `const baz = [];`
  - `var foo = const [];`

- late

### Comment

- single-lin: //
- multi-line: /* */
- document: 

  - ///
  - /** */

### Expression

- Arithmetic: +、-、*、/、~/、%
- Equality：==、!=、identical()
- Compare
- Type

  - as
  - is
  - is!

- Assignment：=、??=
- Logical：!、&&、||
- Bitwise
- Conditional expressions：`expr1 ?? expr2`、`condition ? expr1 : expr2`
- Cascade notation：..、?..
- [Spread](https://github.com/dart-lang/language/blob/main/accepted/2.3/spread-collections/feature-specification.md)
- [Control-flow](https://github.com/dart-lang/language/blob/main/accepted/2.3/control-flow-collections/feature-specification.md)

  - `['Home', if (promoActive) 'Outlet'];`
  - `['#0', for (var i in listOfInts) '#$i'];`
  - if...case
  - switch

### Statement

- Conditional：if .. else if .. else
- Circulation

  - for
  - for..in
  - while

### Patern

- 用法

  - 匹配

    ```dart
    const a = 'a';
    const b = 'b';
    switch (obj) {
      // List pattern [a, b] matches obj first if obj is a list with two fields,
      // then if its fields match the constant subpatterns 'a' and 'b'.
      case [a, b]:
        print('$a, $b');
    }
    ```

  - 解构

    ```dart
    // 解构赋值
    var [a, b, c] = [1, 2, 3];

    // 匹配且解构
    switch (list) {
      // 模式匹配并解构一个双元素列表，其第一个元素是 'a' 或 'b' ：
      case ['a' || 'b', var c]:
        print(c);
    }

    // 解构类实例
    final Foo myFoo = Foo(one: 'one', two: 2);
    var Foo(:one, :two) = myFoo;
    print('one $one, two $two');
    ```

- 类型

  - logical-or

    ```dart
    var isPrimary = switch (color) {
      Color.red || Color.yellow || Color.blue => true,
      _ => false
    };
    ```

  - logical-and

    ```dart
    switch ((1, 2)) {
      // Error, both subpatterns attempt to bind 'b'.
      case (var a, var b) && (var b, var c): // ...
    }
    ```

  - relation

    ```dart
    String asciiCharType(int char) {
      const space = 32;
      const zero = 48;
      const nine = 57;

      return switch (char) {
        < space => 'control',
        == space => 'space',
        > space && < zero => 'punctuation',
        >= zero && <= nine => 'digit',
        _ => ''
      };
    }
    ```

  - cast

    ```dart
    (num, Object) record = (1, 's');
    var (i as int, s as String) = record;
    ```

  - null check

    ```dart
    String? maybeString = 'nullable with base type String';
    switch (maybeString) {
      case var s?:
      // 's' has type non-nullable String here.
    }
    ```
  
  - null assert

    ```dart
    (int?, int?) position = (2, 3);
    var (x!, y!) = position;
    ```
  
  - constant

    ```dart
    switch (number) {
      // Matches if 1 == number.
      case 1: // ...
    }
    ```

  - variable: 常作为解构模式的一部分出现，以捕获解构值。

    ```dart
    switch ((1, 2)) {
      // 'var a' and 'var b' are variable patterns that bind to 1 and 2, respectively.
      case (var a, var b): // ...
      // 'a' and 'b' are in scope in the case body.
    }
    ```

  - list 解构

    ```dart
    var [a, b, ..., c, d] = [1, 2, 3, 4, 5, 6, 7];
    ```

  - Map 解构
  - Record 解构

    ```dart
    var (untyped: untyped, typed: int typed) = record;
    var (:untyped, :int typed) = record;
    switch (record) {
      case (untyped: var untyped, typed: int typed): // ...
      case (:var untyped, :int typed): // ...
    }
    ```
  
  - Object

    ```dart
    switch (shape) {
      // Matches if shape is of type Rect, and then against the properties of Rect.
      case Rect(width: var w, height: var h): // ...
    }
    ```

  - Wildcard

    ```dart
    var list = [1, 2, 3];
    var [_, two, _] = list;
    ```

- 应用

  - 变量声明：`var (a, [b, c]) = ('str', [1, 2]);`
  - 变量赋值：`var (a, b) = ('left', 'right'); (b, a) = (a, b);`
  - switch: 每个 case 子句都包含一个模式。

    ```dart
    switch (obj) {
      // Matches if 1 == obj.
      case 1:
        print('one');

      // Matches if the value of obj is between the
      // constant values of 'first' and 'last'.
      case >= first && <= last:
        print('in range');

      // Matches if obj is a record with two fields,
      // then assigns the fields to 'a' and 'b'.
      case (var a, var b):
        print('a = $a, b = $b');

      default:
    }

    // 逻辑或模式
    var isPrimary = switch (color) {
      Color.red || Color.yellow || Color.blue => true,
      _ => false
    };

    // 逻辑或模式 + 绑定变量
    switch (shape) {
      case Square(size: var s) || Circle(size: var s) when s > 0:
        print('Non-empty symmetric shape');
    }

    // 代数数据类型
    sealed class Shape {}
    class Square implements Shape {
      final double length;
      Square(this.length);
    }
    class Circle implements Shape {
      final double radius;
      Circle(this.radius);
    }
    double calculateArea(Shape shape) => switch (shape) {
      Square(length: var l) => l * l,
      Circle(radius: var r) => math.pi * r * r
    };
    ```

  - if..case

    ```dart
    // 解析 JSON
    if (_json case {
      'metadata': {
        'title': String title,
        'modified': String localModified,
      }
    }) {
      return (title, modified: DateTime.parse(localModified));
    }
    ```

  - for..in

    ```dart
    Map<String, int> hist = {
      'a': 23,
      'b': 100,
    };
    for (var MapEntry(key: key, value: count) in hist.entries) {
      print('$key occurred $count times');
    }
    ```

### Metadata

- `@Deprecated`
- `@deprecated`
- `@override`
- `@pragma`

### Module

- import

  - target

    - core libraries: `dart:xxx`
    - external packages: `package:xxx.dart`
    - files: `path/to/my_other_file.dart`

  - prefix: `import <target> as xxx;`
  - show / hide: 

    - `import 'package:lib1/lib1.dart' show foo;`
    - `import 'package:lib2/lib2.dart' hide foo;`

  - lazy: `import 'package:greetings/hello.dart' deferred as hello;`

- export

## Type

### null

  - !
  - ?
  - ?? / ??=
  - late

### never

### void

### dynamic

### num

- type

  - num
  - int
  - double

- covnert

  - string -> num

    - `int.parse('1')`
    - `double.parse('1.1')`
  
  - int -> string

    - `1.toString()`
    - `3.14159.toStringAsFixed(2)`

### bool

### String

- declare

  - `''`
  - `""`
  - `'' + ''`
  - `''\n''`
  - `'''...\n...'''`
  - `r'...'`

- interpolation

  - $identifier
  - ${expression}

- Unicode 字符：[package:characters/characters.dart](https://pub.dev/packages/characters)

### Enum

### Symbol

- identifier

  ```dart
  void slave({required String m, required int n}) {
    print(m);
    print(n);
  }

  main() {
    print('Hello, World!');
    final a = new Map<Symbol, dynamic>();
    // a[const Symbol('m')] = 'string';
    a[#m] = 'string';
    // a[const Symbol('n')] = 1;
    a[#n] = 1;
    Function.apply(slave, [], a);
  }
  ```

- operator

### Record

> anonymous、immutable、aggregate

- syntax

  - 位置字段：`(int, string) record = (1, 'a')`;
  - 命名字段：`({int a, bool b}) record = (a: 1, b: true)`
  - 位置字段+命名字段：`(String, String, {int a, bool b}) record = ('first', a: 2, b: true, 'last');`
  - declare: `var record = ('first', a: 2, b: true, 'last');`
  - destruction: `(int, int) swap((int, int) record) { var (a, b) = record; return (b, a);}`

- fields

  `var record = ('first', a: 2, b: true, 'last');`

  - `record.$1`
  - `record.a`
  - `record.b`
  - `record.$2`

- equality

  - 位置字段：位置字段的名字不会影响类型

    ```dart
    (int x, int y, int z) point = (1, 2, 3);
    (int r, int g, int b) color = (1, 2, 3);
    point == color; // true
    ```

  - 命名字段：命名字段的名字会影响类型

    ```dart
    ({int x, int y, int z}) point = (x: 1, y: 2, z: 3);
    ({int r, int g, int b}) color = (r: 1, g: 2, b: 3);
    point == color; // false
    ```

- returns

### Collection

- Type

  - Iterable
  - List

    - type: `List<string>`
    - literal：
    
      - `[1, 2, 3]`
      - `<int>[]`
      - `const [1, 2, 3]`

    - access

      - `list[0]`

  - Set

    - literal: 
    
      - `{'fluorine', 'chlorine', 'bromine', 'iodine', 'astatine'}`
      - `<String>{}`

  - Map

    - instance: `Map<String, String>()`
    - literral

      - `{ 'first': 'partridge' }`
      - `const{}`
      - `<int, double>{}`

    - Access: `map[key]`
    - Add：`map['key'] = 'value';`

- Spread：

  - `[0, ...list]`
  - `[0, ...?list]`

- 访问：

  - elementAt
  - first
  - last

- 搜索

  - firstWhere

- 遍历

  - for...in
  - every
  - any
  - map

- 过滤：

  - where
  - takeWhere
  - skipWhere

- 修改
- 删除
- 拷贝

### Function

- 参数

  - 位置参数：`int sumUp(int a, int b, int c)`
  - 可选参数：`int sumUpToFive(int a, [int? b, int? c, int? d, int? e])`
  - 命名参数：

    - `void printName(String firstName, String lastName, {String? middleName})`
    - `void printName(String firstName, String lastName, {required String? middleName})`
    - `void printName(String firstName, String lastName, {String middleName})`
    - `void printName(String firstName, String lastName, {String middleName = ""})`

- 匿名

  - `aListOfStrings.any((s) { return s.isEmpty; })`
  - `aListOfStrings.any((s) => s.isEmpty)`

### Class

- Constructor

  - 属性初始化

    - 位置参数：`class MyColor { int red; int green; int blue; MyColor(this.red, this.green, this.blue); }`
    - 命名参数：`class MyColor { ...; MyColor({required this.red, required this.green, required this.blue});}`

  - 初始化列表：`Point.fromJson(Map<String, double> json): x = json['x']!, y = json['y']! {}`
  - 命名构造函数：`class Point { double x, y; Point(this.x, this.y); Point.origin(): x = 0, y = 0;}`
  - 工厂构造：
  
    ```dart
    class Square extends Shape {}
    class Circle extends Shape {}
    class Shape {
      Shape();
      factory Shape.fromTypeName(String typeName) {
        if (typeName == 'square') return Square();
        if (typeName == 'circle') return Circle();
        throw ArgumentError('Unrecognized $typeName');
      }
    }
    ```

  - 重定向构造：

    ```dart
    class Automobile {
      String make;
      String model;
      int mpg;

      // The main constructor for this class.
      Automobile(this.make, this.model, this.mpg);

      // Delegates to the main constructor.
      Automobile.hybrid(String make, String model) : this(make, model, 60);

      // Delegates to a named constructor
      Automobile.fancyHybrid() : this.hybrid('Futurecar', 'Mark 2');
    }
    ```

- Method

  - Getters & Setters
  - `..`

- Extend
- Mixin
- Interface
- Abstract

### Generic

### typedef

  - `typedef IntList = List<int>`

## Exception

- Type

  - Error
  - Exception

- try...catch..finally

  - `try {} catch (err) {}`
  - `try {} catch (err) { rethrow; }`
  - `try {} on Error catch (err) {} catch (err) {}`
  - `try {} catch (err) {} finally {}`

## Async

- Future

  - Construct

    - Future.delayed
    - Future.error
    - Future.microtask
    - Future.sync
    - Future.value

  - Method

    - then
    - catchError
    - timeout
    - whenComplete

  - Utils

    - Future.any
    - Future.doWhile
    - Future.forEach
    - Future.wait

- FutureOr

  A type representing values that are either `Future<T>` or T.

## Math

> dart:math

- Classes

  - Random
  - Point
  - Rectangle
  - MutableRectangle

- Constants

  - e
  - pi

- Functions

  - exp
  - log
  - max
  - min
  - pow
  - sqrt
