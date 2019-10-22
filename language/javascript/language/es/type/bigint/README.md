# Bigint

## 是什么

BigInt 是 JavaScript 中一种可以用来表示任意精度整数的基本数据类型，使用 BigInt 可以安全的存储和操作任意大小的整数而不受 Number 类型的安全值范围的限制。

- [Specification](https://tc39.es/proposal-bigint/) / https://tc39.es/proposal-bigint/
- [BigInt: Arbitrary precision integers in JavaScript](https://github.com/tc39/proposal-bigint)

## 为什么

JavaScript 中 Number 是以 64 位双精度浮点型存储，所以会有精度限制，JavaScript 中可以准确表示的最大整数是Number.MAXSAFEINTEGER 这个值是 2^53-1

```js
const x = Number.MAX_SAFE_INTEGER;
// ↪ 9007199254740991, this is 1 less than 2^53

const y = x + 1;
// ↪ 9007199254740992, ok, checks out

const z = x + 2
// ↪ 9007199254740992, wait, that’s the same as above!
```

y 和 z 的结果一致，这就导致我们无法保证在 JavaScript 中获取到的这个值的准确性，JavaScript 中任何超出安全值范围的计算都会丢失精度，正因为如此我们只能信任安全值范围内的整数。

- [BigInts in JavaScript: A case study in TC39](https://docs.google.com/presentation/d/1apPbAiv_-mJF35P31IjaII8UA6TwSynCA_zhfDEmgOE/edit#slide=id.g38a1897a56_0_97)

## 怎么用

生成一个BigInt类型的值只需要在任意整数后加上n做后缀即可。例如：123 用BigInt类型表示123n,也可以通过全局函数 BigInt(number) 来将 Number 类型转化为 BigInt 类型，换言之 BigInt(123) === 123n。

```js
// 声明
1n; // 1n
-1n; // -1n
+1n; // Uncaught TypeError: Cannot convert a BigInt value to a number
// 类型
typeof 123n; // bigint
BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991n
!0n; // true
!1n; // false
// 运算符
// - 相等
3n === BigInt(3); // true
3n == 3; // true
3n === 3; // false
// - 算术运算符
(7n + 6n - 5n) *4n ** 3n / 2n % 3n; //1n
1n + 1; // VM4559:1 Uncaught TypeError: Cannot mix BigInt and other types, use explicit conversions
// - 比较运算符
1 < 2n; // true
```


### [兼容性](https://caniuse.com/#feat=bigint)

## 参考文献

- [BigInt: arbitrary-precision integers in JavaScript](https://v8.dev/features/bigint)
- [ES proposal: BigInt – arbitrary precision integers](https://2ality.com/2017/03/es-integer.html)
- [MDN BigInt](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt)
- [【第1751期】JavaScript基本类型之--BigInt](https://mp.weixin.qq.com/s/U1PDyhNkfgh6ALND68b3Ig)
