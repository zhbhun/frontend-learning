# [类型](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)

## 基础

### 底层数据类型

#### [any](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#any)

简介：任意类型

语法：

- 赋值：

    - 可以将任意类型的值赋值给 any 类型的变量或属性；
    - 可以将 any 类型的值赋给任意类型的变量或属性；

- 操作：可以对 any 类型的值执行任意操作（访问属性、函数调用）；
- 组合：any 与任意类型联合或交叉后的类型都是 any

使用：在一些旧项目中可以使用 any 来逃避 ts 的类型检查

示例：[any](./examples/any/)

#### unkown

简介：未知类型

语法：

- 赋值：

    - 可以将任意类型的值赋值给 unkown 类型的变量或属性；
    - 不可以将 unknown 类型的赋给赋给除了 any 和 unknown 之外的任意类型的变量或属性；

- 操作：不可以对 unkown 类型的值执行除了等于或不等于运算符之外的任意操作；

    - 类型检测：可以使用 typeof、instanceof 和定制的类型检测函数来检测 unknown 类型
    - 类型断言：使用类型断言可以强制转换类型

- 组合：

    - Union Type：任意类型与 unknown 类型联合后都会变成 unknown 类型

        除了 any 类型之外，any 和 unknown 联合会变成 any 类型

    - Intersection Types：任意类型与 unknown 类型交叉后都变成原类型

示例：[unkown](./examples/unkown/)

参考：

- [The unknown Type in TypeScript](https://mariusschulz.com/blog/the-unknown-type-in-typescript)

#### never

简介：never 类型表示该只类型不可能发生，这是为了满足一些场景提供的更加的安全的类型，例如下面的两个函数调用返回值类型都是 never，表示不可能有返回值。

- 抛异常的函数：

    ```ts
    const reportError = function () {
      throw Error('my error');
    }
    ```

- 无限循环的函数：

    ```ts
    const loop = function () {
      while(true) {}
    }
    ```

语法：

- 赋值：一般不会对 never 类型赋值
- 操作：一般不会对 never 类型操作
- 组合：一般不会对 never 对象组合

使用：

- 用于表示会抛出异常或根本就不会有返回值的函数表达式或箭头函数表达式的返回值类型
- 排除联合类型中的不想要的类型

    ```ts
    type NonNullable<T> = T extends null | undefined ? never : T;

    type A = NonNullable<boolean>;            // boolean
    type B = NonNullable<number | null>;      // number
    ```

- ...

示例：[never](./examples/never)

参考：

- [Use of never keyword in typescript](https://stackoverflow.com/questions/42291811/use-of-never-keyword-in-typescript)
- [TypeScript never 类型](http://www.semlinker.com/ts-never-type/)
- [TypeScript中的never类型具体有什么用？](https://www.zhihu.com/question/354601204)

#### void

简介：void 表示函数没有返回值，与 never 的区别在于 void 类型可以接受 undefined 或 null。

语法：

```ts
function warnUser(): void {
  console.log("This is my warning message");
}
```

使用：没有返回值的函数默认返回类型为 void，但 void 返回值不能赋值给 undefined。

### 原始数据类型

- `null`
- `undefined`
- `number`
- `string`
- `boolean`
- `symbol`
- `bigint`

### 引用类型

#### [Arrays](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#arrays)

```ts
Array<number>
number[]
ReadonlyArray<string>
readonly string[]
```

#### [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)：

```ts
// # Object Types 就是列出所有的属性和属性类型，多个属性之间可以使用 `;` 或 `,` 隔开
function printCoord(pt: { x: number; y: number }) {
  console.log("The coordinate's x value is " + pt.x);
  console.log("The coordinate's y value is " + pt.y);
}

// # 可选属性：在属性后面添加 ? 号可以设置属性为可选的，即可能是 undefined，如果开启了 strictNullChecker，那么使用时必须检查属性是否是 undefined
function printName(obj: { first: string; last?: string }) {
  // Error - might crash if 'obj.last' wasn't provided!
  console.log(obj.last.toUpperCase());
  // Object is possibly 'undefined'.
  if (obj.last !== undefined) {
    // OK
    console.log(obj.last.toUpperCase());
  }
 
  // A safe alternative using modern JavaScript syntax:
  console.log(obj.last?.toUpperCase());
}

// # 只读属性
interface SomeType {
  readonly prop: string;
}

// # Index Signatures
interface StringArray {
  [index: number]: string;
}
const myArray: StringArray = getStringArray();
const secondItem = myArray[1]; // const secondItem: string

// # 多类型的 Index Signature 要求 number 类型的 index 值类型必须是 string 类型的 index 的子类型
interface Animal {
  name: string;
}
interface Dog extends Animal {
  breed: string;
}
// Error: indexing with a numeric string might get you a completely separate type of Animal!
interface NotOkay {
  [x: number]: Animal;
'number' index type 'Animal' is not assignable to 'string' index type 'Dog'.
  [x: string]: Dog;
}

// # string 类型的 Index Signature 要求所有属性都匹配它的属性值类型
interface NumberDictionary {
  [index: string]: number;
 
  length: number; // ok
  name: string; // Property 'name' of type 'string' is not assignable to 'string' index type 'number'.
}

// # extend
interface Colorful {
  color: string;
}
interface Circle {
  radius: number;
}
interface ColorfulCircle extends Colorful, Circle {}
const cc: ColorfulCircle = {
  color: "red",
  radius: 42,
};

// # Intersection Types
interface Colorful {
  color: string;
}
interface Circle {
  radius: number;
}
type ColorfulCircle = Colorful & Circle;
// ps：Extend 和 Intersection Type 的区别在于同名属性的处理方式，前者要求子类兼容父类，后者不兼容类型会变为 never。

// Indexed Access Types —— https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
type Person = { age: number; name: string; alive: boolean };
type Age = Person["age"];
type I1 = Person["age" | "name"]; // type I1 = string | number
type I2 = Person[keyof Person]; // type I2 = string | number | boolean
type AliveOrName = "alive" | "name";
type I3 = Person[AliveOrName]; // type I3 = string | boolean
type I1 = Person["alve"]; // Property 'alve' does not exist on type 'Person'.
const MyArray = [
  { name: "Alice", age: 15 },
  { name: "Bob", age: 23 },
  { name: "Eve", age: 38 },
];
type Person = typeof MyArray[number];
const key = "age";
type Age = Person[key]; // Type 'key' cannot be used as an index type. 'key' refers to a value, but is being used as a type here. Did you mean 'typeof key'?
type key = "age";
type Age = Person[key]; // type Age = number
/*
  
  type Person = {
    name: string;
    age: number;
  }
*/
```

#### [Interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#interfaces)

Interfaces 是声明对象类型的另外一种方式，可以方便复用，但需要注意的是 TS 只关心数据结构，如果两个接口名称不一致而数据结构一直，那么它们是等价的，所以很多时候会称 TS 是一个结构类型系统。

    ```ts
    // 
    interface Person {
      name: number;
      optionProp?: number;
    }

    interface Teacher extend Person {
      school: string;
    }


    interface Teacher {
      class: string;
    }
    ```

#### [Functions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#functions)

```ts
function greet(name: string): string {}
```

### 其他类型

#### [Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-aliases)：

```ts
type Point = {
  x: number;
  y: number;
};
type ID = number | string;
type UserInputSanitizedString = string;
```

type vs interface

- 继承：interface 支持继承，type 可以使用 & 符号

    - interface：

        ```ts
        interface Animal {
          name: string
        }
        
        interface Bear extends Animal {
          honey: boolean
        }
        
        const bear = getBear() 
        bear.name
        bear.honey
        ```

    - type

        ```ts
        type Animal = {
          name: string
        }
        
        type Bear = Animal & { 
          honey: boolean 
        }
        
        const bear = getBear();
        bear.name;
        bear.honey;
        ```

- 扩展：interface 可以重复声明来扩展现有类型，type 不支持

    - interface

        ```ts
        interface Window {
          title: string
        }
        
        interface Window {
          ts: TypeScriptAPI
        }
        
        const src = 'const a = "Hello World"';
        window.ts.transpileModule(src, {});
        ```

    - type

        ```ts
        type Window = {
          title: string
        }
        
        type Window = {
          ts: TypeScriptAPI
        }
        
        // Error: Duplicate identifier 'Window'.
        ```

- 非对象类型：type 支持非对象类型的别名定义，interface 不支持

总结：对象类型一般都使用 interface，只有 interface 无法满足的情况下才使用 type

#### [Literal Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#literal-types)

- 原始数据类型字面量

    ```ts
    // 常量默认设定为 Literal Types
    let changingString = "Hello World"; // let changingString: string
    changingString = "Olá Mundo";
    // Because `changingString` can represent any possible string, that is how TypeScript describes it in the type system
    const constantString = "Hello World"; // const constantString: "Hello World"
    // Because `constantString` can only represent 1 possible string, it has a literal type representation
          
    // 一般不会直接声明 Literal Types
    let x: "hello" = "hello";
    // OK
    x = "hello";
    // ...
    x = "howdy";  // Type '"howdy"' is not assignable to type '"hello"'.

    // Literal Types 一般用于组合成 Union Type
    function printText(s: string, alignment: "left" | "right" | "center") {
      // ...
    }
    interface Options {
      width: number;
    }
    function configure(x: Options | "auto") {
      // ...
    }
    ```

- 对象属性类型字面量

    ```ts
    // 对象字面量的属性类型默认推导为属性值所属的类型
    const obj = { counter: 0 };
    if (someCondition) {
      obj.counter = 1; // conter: number
    }

    // 如果对象字面量临时赋值给变量，再作为函数参数调用，会因为属性类型的自动推导而报错，可以在对象字面量赋值给变量时显示的声明属性类型来解决该问题
    function handleRequest(url: string, method: 'GET' | 'POST') {}
    const req = { url: "https://example.com", method: "GET" };
    handleRequest(req.url, req.method); // Argument of type 'string' is not assignable to parameter of type '"GET" | "POST"'.
    // Change 1:
    const req = { url: "https://example.com", method: "GET" as "GET" };
    // Change 2:
    handleRequest(req.url, req.method as "GET");
    // Change 3:
    const req = { url: "https://example.com", method: "GET" } as const;
    ```

#### [Enums](https://www.typescriptlang.org/docs/handbook/enums.html)

```ts
enum Direction {
  Up = 1,
  Down,
  Left,
  Right,
}
```

#### [Tuple](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types)

简介：Tuple（元组类型），用于表示一个固定长度且类型确定的数组。

语法：

```ts
// # Declare a tuple type
let x: [string, number];
// Initialize it
x = ["hello", 10]; // OK
// Initialize it incorrectly
x = [10, "hello"]; // Error

// # Tuples can have optional properties
type Either2dOr3d = [number, number, number?];
function setCoordinate(coord: Either2dOr3d) {
  const [x, y, z] = coord; // const z: number | undefined
}

// # Tuples can also have rest elements, which have to be an array/tuple type
type StringNumberBooleans = [string, number, ...boolean[]];
type StringBooleansNumber = [string, ...boolean[], number];
type BooleansStringNumber = [...boolean[], string, number];
function readButtonInput(...args: [string, number, ...boolean[]]) {
  const [name, version, ...input] = args;
  // ...
}
function readButtonInput(name: string, version: number, ...input: boolean[]) {
  // ...
}

// # readonly
function doSomething(pair: readonly [string, number]) {
  pair[0] = "hello!"; // Cannot assign to '0' because it is a read-only property.
}
let point = [3, 4] as const;
function distanceFromOrigin([x, y]: [number, number]) {
  return Math.sqrt(x ** 2 + y ** 2);
}
distanceFromOrigin(point);
// Argument of type 'readonly [3, 4]' is not assignable to parameter of type '[number, number]'.
//   The type 'readonly [3, 4]' is 'readonly' and cannot be assigned to the mutable type '[number, number]'.
```

## 进阶

### 类型兼容性

简介：TS 是基于结构子类型来判断类型兼容的。

语法：

- 对象类型：对象类型的每个属性值都能在对象值上找到兼容的属性值

    ```ts
    interface Pet {
      name: string;
    }
    let dog = { name: "Lassie", owner: "Rudd Weatherwax" };

    let pet: Pet = god;

    function greet(pet: Pet) {
      console.log("Hello, " + pet.name);
    }
    greet(dog); // OK
    ```

- 函数类型：函数值的每个参数都能在函数类型上找到兼容的参数，返回值需要符合对象类型的规则

    ```ts
    let x = (a: number) => 0;
    let y = (b: number, s: string) => 0;
    y = x; // OK
    x = y; // Error

    let items = [1, 2, 3];
    // Don't force these extra parameters
    items.forEach((item, index, array) => console.log(item));
    // Should be OK!
    items.forEach((item) => console.log(item));

    let x = () => ({ name: "Alice" });
    let y = () => ({ name: "Alice", location: "Seattle" });
    x = y; // OK
    y = x; // Error, because x() lacks a location property
    ```

- 函数参数类型特定化：

    ```ts
    enum EventType {
      Mouse,
      Keyboard,
    }
    interface Event {
      timestamp: number;
    }
    interface MyMouseEvent extends Event {
      x: number;
      y: number;
    }
    interface MyKeyEvent extends Event {
      keyCode: number;
    }
    function listenEvent(eventType: EventType, handler: (n: Event) => void) {
      /* ... */
    }
    // Unsound, but useful and common
    listenEvent(EventType.Mouse, (e: MyMouseEvent) => console.log(e.x + "," + e.y));
    // Undesirable alternatives in presence of soundness
    listenEvent(EventType.Mouse, (e: Event) =>
      console.log((e as MyMouseEvent).x + "," + (e as MyMouseEvent).y)
    );
    listenEvent(EventType.Mouse, ((e: MyMouseEvent) =>
      console.log(e.x + "," + e.y)) as (e: Event) => void);
    // Still disallowed (clear error). Type safety enforced for wholly incompatible types
    listenEvent(EventType.Mouse, (e: number) => console.log(e));
    ```

    ps：这在开启 `strictFunctionTypes` 时，不允许函数参数类型特定化

- 函数可选参数和剩余参数

    ```ts
    function invokeLater(args: any[], callback: (...args: any[]) => void) {
      /* ... Invoke callback with 'args' ... */
    }
    // Unsound - invokeLater "might" provide any number of arguments
    invokeLater([1, 2], (x, y) => console.log(x + ", " + y));
    // Confusing (x and y are actually required) and undiscoverable
    invokeLater([1, 2], (x?, y?) => console.log(x + ", " + y));
    ```

- 函数重载：每个重载函数类型都要能够与重载函数兼容
- 类实例：只比较两个对象的成员属性是否兼容，类似对象或接口类型

    ```ts
    class Animal {
      feet: number;
      constructor(name: string, numFeet: number) {}
    }
    class Size {
      feet: number;
      constructor(numFeet: number) {}
    }
    let a: Animal;
    let s: Size;
    a = s; // OK
    s = a; // OK
    ```

- 带私有成员和包含成员的类实例：目标类型必须是源类型的父类，即子类实例可以赋值给父类实例

参考

- [Type Compatibility
](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability)

### [Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)：

```ts
// Union Types 由两个或多个类型组成，其值可以是这些类型中的任意一个
function printId(id: number | string) {
  console.log("Your ID is: " + id.toString());
}

function printId(id: number | string) {
  // 只允许执行所有 Union Types 都支持的操作
  console.log(id.toUpperCase()); 
  // Property 'toUpperCase' does not exist on type 'string | number'
  // Property 'toUpperCase' does not exist on type 'number'.
  // 针对以上问题的解决方案是 narrow the union types
  if (typeof id === "string") {
    // In this branch, id is of type 'string'
    console.log(id.toUpperCase());
  } else {
    // Here, id is of type 'number'
    console.log(id);
  }
}
```

### [Intersection Types]()

TODO: ...


### [Type Assertions](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions)

```ts
// ts 可以通过类型断言将一个值的类型转换为更加特定（子类）或者更不特定（父类）的类型
const myCanvas = document.getElementById("main_canvas") as HTMLCanvasElement;
// 也可以使用尖括号语法，但不能在 tsx 里使用
const myCanvas = <HTMLCanvasElement>document.getElementById("main_canvas");

// 可以将值类型先转换为 any 或 unknown 然后再转为特定类型
const x = "hello" as number; // Conversion of type 'string' to type 'number' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
const y = ("hello" as unkown) as number;

// # as const
function handleRequest(url: string, method: 'GET' | 'POST') {}
const req = { url: "https://example.com", method: "GET" } as const;
handleRequest(req.url, req.method);
```

### [Non-null Assertion Operator (Postfix !)](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#non-null-assertion-operator-postfix-)

```ts
function liveDangerously(x?: number | null) {
  // No error
  console.log(x!.toFixed());
}
```

ps：区分 JS 的可选链操作符 `?`，非空断言操作符 `!` 只是让 ts 忽略空值情况，实际运行可能还是会遇到问题。

- [Safe navigation operator (?.) or (!.) and null property paths](https://stackoverflow.com/questions/40238144/safe-navigation-operator-or-and-null-property-paths)

### [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)

TODO

### [Generics](https://www.typescriptlang.org/docs/handbook/2/generics.html)

TODO

### [Typeof Type Operator](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html)

JS 本身已经有了 `typeof` 操作符，用于获取值类型。TS 在类型上下文中也支持 `typeof`，用于获取**变量或属性类型**。

```ts
// # js
// Prints "string"
console.log(typeof "Hello world");

// # ts
let s = "hello";
let n: typeof s; // let n: string

// # ReturnType
function f() {
  return { x: 10, y: 3 };
}
type P = ReturnType<typeof f>;
/*
  type P = {
    x: number;
    y: number;
  }
*/
```

### [Keyof Type Operator](https://www.typescriptlang.org/docs/handbook/2/keyof-types.html)

`keyof` 操作符接受对象类型生成一个字符或数值字面量联合类型。

```ts
type Point = { x: number; y: number };
type P = keyof Point; // “x” | “y”:

type Arrayish = { [n: number]: unknown };
type A = keyof Arrayish; // type A = number
 
type Mapish = { [k: string]: boolean };
type M = keyof Mapish; // type M = string | number
```

### [Conditional Types](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html)

```ts
// # ondition ? trueExpression : falseExpression
interface Animal {
  live(): void;
}
interface Dog extends Animal {
  woof(): void;
}
type Example1 = Dog extends Animal ? number : string; // type Example1 = number
type Example2 = RegExp extends Animal ? number : string; // type Example2 = string

// # SomeType extends OtherType ? TrueType : FalseType;
// extend 表示左边的类型是否赋值给右边的类型

// # 实际应用1
// 笨方法
interface IdLabel {
  id: number /* some fields */;
}
interface NameLabel {
  name: string /* other fields */;
}
function createLabel(id: number): IdLabel;
function createLabel(name: string): NameLabel;
function createLabel(nameOrId: string | number): IdLabel | NameLabel;
function createLabel(nameOrId: string | number): IdLabel | NameLabel {
  throw "unimplemented";
}
// 条件类型方法
type NameOrId<T extends number | string> = T extends number
  ? IdLabel
  : NameLabel;
function createLabel<T extends number | string>(idOrName: T): NameOrId<T> {
  throw "unimplemented";
}
let a = createLabel("typescript"); // let a: NameLabel
let b = createLabel(2.8); // let b: IdLabel
let c = createLabel(Math.random() ? "hello" : 42); // let c: NameLabel | IdLabel

// # 实际应用2
type NonNullable<T> = T extends null | undefined ? never : T;
type A = NonNullable<boolean>; // boolean

// # 实际应用3
type Flatten<T> = T extends any[] ? T[number] : T;
type Str = Flatten<string[]>; // type Str = string
type Num = Flatten<number>; // type Num = number

// # infer
type Flatten<Type> = Type extends Array<infer Item> ? Item : Type;
type GetReturnType<Type> = Type extends (...args: never[]) => infer Return
  ? Return
  : never;

// # Distributive Conditional Types
type ToArray<Type> = Type extends any ? Type[] : never;
type StrArrOrNumArr = ToArray<string | number>; // type StrArrOrNumArr = string[] | number[]
type StrArrOrNumArr = ToArray<string> | ToArray<number>; // type StrArrOrNumArr = string[] | number[]
type ToArrayNonDist<Type> = [Type] extends [any] ? Type[] : never;
type StrArrOrNumArr = ToArrayNonDist<string | number>; // type StrArrOrNumArr = (string | number)[]
```

### [Mapped Types](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#mapping-modifiers)

TODO

### [Template Literal Types](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html)

```ts
// # 模板字面量类型基于字符字面量类型和类似 JS 的模板预发构成
type World = "world";
type Greeting = `hello ${World}`; // type Greeting = "hello world"

// # 模板字面量类型中使用联合类型会产生所有可能的字符字面量组合类型
type EmailLocaleIDs = "welcome_email" | "email_heading";
type FooterLocaleIDs = "footer_title" | "footer_sendoff";
type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`; // type AllLocaleIDs = "welcome_email_id" | "email_heading_id" | "footer_title_id" | "footer_sendoff_id"

// # 多个联合类型会交叉出所有可能的字符字面量
type AllLocaleIDs = `${EmailLocaleIDs | FooterLocaleIDs}_id`;
type Lang = "en" | "ja" | "pt";
type LocaleMessageIDs = `${Lang}_${AllLocaleIDs}`; // type LocaleMessageIDs = "en_welcome_email_id" | "en_email_heading_id" | "en_footer_title_id" | "en_footer_sendoff_id" | "ja_welcome_email_id" | "ja_email_heading_id" | "ja_footer_title_id" | "ja_footer_sendoff_id" | "pt_welcome_email_id" | "pt_email_heading_id" | "pt_footer_title_id" | "pt_footer_sendoff_id"

// # String Unions in Types
type PropEventSource<Type> = {
    on(eventName: `${string & keyof Type}Changed`, callback: (newValue: any) => void): void;
};
declare function makeWatchedObject<Type>(obj: Type): Type & PropEventSource<Type>;
const person = makeWatchedObject({
  firstName: "Saoirse",
  lastName: "Ronan",
  age: 26,
});
person.on("firstNameChanged", (newValue) => {
  console.log(`firstName was changed to ${newValue}!`);
});
person.on("firstName", () => {}); // Argument of type '"firstName"' is not assignable to parameter of type '"firstNameChanged" | "lastNameChanged" | "ageChanged"'.

// # Inference with Template Literals
type PropEventSource<Type> = {
    on<Key extends string & keyof Type>
        (eventName: `${Key}Changed`, callback: (newValue: Type[Key]) => void ): void;
};
declare function makeWatchedObject<Type>(obj: Type): Type & PropEventSource<Type>;

// # Intrinsic String Manipulation Types
// Uppercase<StringType>
type Greeting = "Hello, world"
type ShoutyGreeting = Uppercase<Greeting> // type ShoutyGreeting = "HELLO, WORLD"
type ASCIICacheKey<Str extends string> = `ID-${Uppercase<Str>}`
type MainID = ASCIICacheKey<"my_app"> // type MainID = "ID-MY_APP"
// Lowercase<StringType>
type Greeting = "Hello, world"
type QuietGreeting = Lowercase<Greeting> // type QuietGreeting = "hello, world"
// Capitalize<StringType>
type LowercaseGreeting = "hello, world";
type Greeting = Capitalize<LowercaseGreeting>; // type Greeting = "Hello, world"
// Uncapitalize<StringType>
type UppercaseGreeting = "HELLO WORLD";
type UncomfortableGreeting = Uncapitalize<UppercaseGreeting>; // type UncomfortableGreeting = "hELLO WORLD"
```

TODO
