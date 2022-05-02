const neverOfreportError = function () {
  throw Error("my error");
};

const neverOfloop = function () {
  while (true) {}
};

function controlFlowAnalysisWithNever(foo: Foo) {
  if (typeof foo === "string") {
    // 这里 foo 被收窄为 string 类型
    return foo; // string
  } else if (typeof foo === "number") {
    // 这里 foo 被收窄为 number 类型
    return foo; // number
  } else {
    // foo 在这里是 never
    return foo; // never
  }
}

type NonNullable1<T> = T extends null | undefined ? never : T;
type A = NonNullable1<boolean>; // boolean
type B = NonNullable1<number | null>; // number

type Foo = string | number;
