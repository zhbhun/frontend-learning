// # 接受任意类型的值
let unkownVar: unknown;
unkownVar = true; // OK
unkownVar = 42; // OK
unkownVar = "Hello World"; // OK
unkownVar = []; // OK
unkownVar = {}; // OK
unkownVar = Math.random; // OK
unkownVar = null; // OK
unkownVar = undefined; // OK
unkownVar = new TypeError(); // OK
unkownVar = Symbol("type"); // OK

// # 不可以将 unknown 类型的赋给赋给除了 any 之外的任意类型的变量或属性；
let unkownValue: unknown;
let value1: unknown = unkownValue; // OK
let value2: any = unkownValue; // OK
let value3: boolean = unkownValue; // Error
let value4: number = unkownValue; // Error
let value5: string = unkownValue; // Error
let value6: object = unkownValue; // Error
let value7: any[] = unkownValue; // Error
let value8: Function = unkownValue; // Error
