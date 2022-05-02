// # 不可以对 unkown 类型的值执行除了等于或不等于运算符之外的任意操作；
let anyOperation: any;
anyOperation.foo.bar; // Error
anyOperation.trim(); // Error
anyOperation(); // Error
new anyOperation(); // Error
anyOperation[0][1]; // Error
anyOperation > anyOperation;
anyOperation == anyOperation;
anyOperation != anyOperation;
anyOperation === anyOperation;
anyOperation !== anyOperation;

// # 使用 typeof 或者 instanceof 检测 any 的类型
function stringifyForLogging(value: any): string {
  if (value instanceof Date) {
    // Within this branch, `value` has type `Date`,
    // so we can call the `toISOString` method
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.length.toString();
  }

  return String(value);
}

// # 使用自定义类型检测函数来检测 any 类型
/**
 * A custom type guard function that determines whether
 * `value` is an array that only contains numbers.
 */
function isNumberArray(value: any): value is number[] {
  return (
    Array.isArray(value) &&
    value.every((element) => typeof element === "number")
  );
}
const anyValue1: any = [15, 23, 8, 4, 42, 16];
if (isNumberArray(anyValue1)) {
  // Within this branch, `anyValue1` has type `number[]`,
  // so we can spread the numbers as arguments to `Math.max`
  const max = Math.max(...anyValue1);
  console.log(max);
}
