// # 接受任意类型的值
let anyVar: any;
anyVar = true; // OK
anyVar = 42; // OK
anyVar = "Hello World"; // OK
anyVar = []; // OK
anyVar = {}; // OK
anyVar = Math.random; // OK
anyVar = null; // OK
anyVar = undefined; // OK
anyVar = new TypeError(); // OK
anyVar = Symbol("type"); // OK

// # 可以赋值给任意类型的变量或属性；
let anyValue: any;
let value1: unknown = anyValue; // OK
let value2: any = anyValue; // OK
let value3: boolean = anyValue; // OK
let value4: number = anyValue; // OK
let value5: string = anyValue; // OK
let value6: object = anyValue; // OK
let value7: any[] = anyValue; // OK
let value8: Function = anyValue; // OK
