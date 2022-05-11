// 减、乘、除
(function () {
  console.log("// 减、乘、除");
  console.log("uundefined * 2 = ", undefined * 2);
  console.log("nnull * 2 = ", null * 2);
  console.log("NNaN * 2 = ", NaN * 2);
  console.log("ttrue * 2 = ", true * 2);
  console.log("ffalse * 2 = ", false * 2);
  console.log('"" * 2 = "', "" * 2);
  console.log('" * 2 = ', " 2 " * 2);
  console.log('"02" * 2 = ', "0002" * 2);
  console.log('"" * 2 =": ', "-2" * 2);
  console.log('"infinity" * 2 = ', "Infinity" * 2);
  console.log('"infinity" * 2 = ', "-Infinity" * 2);
  console.log('"0b10" * 2 = ', "0b10" * 2);
  console.log('"0o10" * 2 = ', "0o10" * 2);
  console.log('"0x10" * 2 = ', "0x10" * 2);
  console.log("{} * 2 = ", {} * 2);
  console.log("[] * 2 = ", [] * 2);
  console.log("[undefined] * 2 = ", [undefined] * 2);
  console.log("[null] * 2 = ", [null] * 2);
  console.log("[true] * 2 = ", [true] * 2);
  console.log("[ * 2 = ", [2] * 2);
  console.log('[""] * 2 = ', [""] * 2);
  console.log('["2"] * 2 = ', ["2"] * 2);
  console.log("[2] * 2 =  ", [1, 2] * 2);
  console.log("new Date() * 2 = ", new Date() * 2);
})();

// 加法
(function () {
  console.log(">> 加法");
  console.log('"2" + 2 = ', "2" + 2);
  try {
    console.log('"2" + Symbol() = ', "2" + Symbol());
  } catch (error) {
    console.log('"2" + Symbol() = ', error.message);
  }
  console.log("2 + undefined =", 2 + undefined);
  console.log("2 + null =", 2 + null);
  console.log("2 + NaN =", 2 + NaN);
  console.log("2 + 0 =", 2 + 0);
  console.log("2 + true =", 2 + true);
  console.log("2 + false =", 2 + false);
  try {
    console.log("2 + 2n = ", 2 + 2n);
  } catch (error) {
    console.log("2 + 2n = ", error.message);
  }
  console.log("2n + 2n =", 2n + 2n);
  try {
    console.log("2 + Symbol() = ", 2 + Symbol());
  } catch (error) {
    console.log("2 + Symbol() = ", error.message);
  }
  console.log("2 + {} =", 2 + {});
  console.log("2 + [] =", 2 + []);
  console.log("2 + [2] =", 2 + [2]);
  console.log("undefined + undefined =", undefined + undefined);
  console.log("undefined + null =", undefined + null);
  console.log("undefined + true =", undefined + true);
  console.log("undefined + 1 =", undefined + 1);
  console.log("null + undefined =", null + undefined);
  console.log("null + null =", null + null);
  console.log("null + true =", null + true);
  console.log("null + 1 =", null + 1);
  console.log("undefined + {} = ", undefined + {});
})();

// 比较运算符
(function () {
  console.log(">> 比较运算符");
  console.log("undefined >= undefined =", undefined >= undefined);
  console.log("undefined >= undefined =", undefined <= undefined);
  console.log("null >= null =", null >= null);
  console.log("null >= 0 =", null >= 0);
  console.log("null >= 1 =", null >= 1);
  console.log("NaN >= NaN", NaN >= NaN);
  console.log("+0 == -0 =", +0 == -0);
  console.log("true > 0 =", true > 0);
  console.log("false < 1 =", false < 1);
  console.log('10 >= "(" =', 10 >= "(");
  console.log('"10" >= "(" =', "10" >= "(");
  console.log("Date.now() + 100 > new Date() =", Date.now() + 100 > new Date());
})();

// 相等运算符
(function () {
  console.log(">> 相等运算符");
  console.log("null == null=", null == null);
  console.log("null === null=", null === null);
  console.log("Object.is(null, null) =", Object.is(null, null));
  console.log("null == undefined=", null == undefined);
  console.log("null === undefined=", null === undefined);
  console.log("Object.is(null, undefined) =", Object.is(null, undefined));
  console.log("NaN == NaN=", NaN == NaN);
  console.log("NaN === NaN=", NaN === NaN);
  console.log("Object.is(NaN, NaN) =", Object.is(NaN, NaN));
  console.log("+0 == -0=", +0 == -0);
  console.log("+0 === -0=", +0 === -0);
  console.log("Object.is(+0, -0) =", Object.is(+0, -0));
  console.log("true == 1 =", true == 1);
  console.log("true === 1 =", true === 1);
  console.log("Object.is(true, 1) =", Object.is(true, 1));
  console.log('"01" == 1 =', "01" == 1);
  const now = new Date();
  console.log("now == now.getTime() =", now == now.getTime());
  console.log("now == now.getTime() =", now == now.toString());
})();
