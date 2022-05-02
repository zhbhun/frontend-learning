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

`Array<number>` / `number[]`

#### [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)：

```ts
// Object Types 就是列出所有的属性和属性类型，多个属性之间可以使用 `;` 或 `,` 隔开
function printCoord(pt: { x: number; y: number }) {
  console.log("The coordinate's x value is " + pt.x);
  console.log("The coordinate's y value is " + pt.y);
}
// 在属性后面添加 ? 号可以设置属性为可选的，即可能是 undefined
// 如果开启了 strictNullChecker，那么使用时必须检查属性是否是 undefined
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

#### Tuple

简介：Tuple（元组类型），用于表示一个固定长度且类型确定的数组。

语法：

```ts
// Declare a tuple type
let x: [string, number];
// Initialize it
x = ["hello", 10]; // OK
// Initialize it incorrectly
x = [10, "hello"]; // Error
```

## 进阶


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

### 类型兼容性

- [Type Compatibility
](https://www.typescriptlang.org/docs/handbook/type-compatibility.html#any-unknown-object-void-undefined-null-and-never-assignability)
