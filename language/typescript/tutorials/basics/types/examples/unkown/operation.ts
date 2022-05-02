// # 不可以对 unkown 类型的值执行除了等于或不等于运算符之外的任意操作；
let unkownOperation: unknown;
unkownOperation.foo.bar; // Error
unkownOperation.trim(); // Error
unkownOperation(); // Error
new unkownOperation(); // Error
unkownOperation[0][1]; // Error
unkownOperation > unkownOperation
unkownOperation == unkownOperation
unkownOperation != unkownOperation
unkownOperation === unkownOperation
unkownOperation !== unkownOperation


// # 使用 typeof 或者 instanceof 检测 unknown 的类型
function stringifyForLogging(value: unknown): string {
  if (typeof value === "function") {
    // Within this branch, `value` has type `Function`,
    // so we can access the function's `name` property
    const functionName = value.name || "(anonymous)";
    return `[function ${functionName}]`;
  }

  if (value instanceof Date) {
    // Within this branch, `value` has type `Date`,
    // so we can call the `toISOString` method
    return value.toISOString();
  }

  return String(value);
}

// # 使用自定义类型检测函数来检测 unknown 类型
/**
 * A custom type guard function that determines whether
 * `value` is an array that only contains numbers.
 */
 function isNumberArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) && value.every(element => typeof element === "number")
  );
}
const unknownValue: unknown = [15, 23, 8, 4, 42, 16];
if (isNumberArray(unknownValue)) {
  // Within this branch, `unknownValue` has type `number[]`,
  // so we can spread the numbers as arguments to `Math.max`
  const max = Math.max(...unknownValue);
  console.log(max);
}
