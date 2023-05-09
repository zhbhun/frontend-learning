# 面试

## 笔试题

### 编写一个泛型函数，获取对象中指定属性的值

问题

```ts
function getProperty(obj, key) {
    return obj[key]
}
class Person {
    name: string;
    constructor(name: string) {
        this.name = name;
    } 
}
const person = new Person('a');
const name = getProperty(person); // 最终 name 是 string 类型的
```

答案

```ts
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
    return obj[key];
}
```

https://www.typescriptlang.org/play?ssl=1&ssc=1&pln=3&pc=1#code/GYVwdgxgLglg9mABAcwKZQAoCc4AdVZQCeAFHAEYBWANIgNapECUiA3gFCJeJbohZIKlANoMiAXXYBfdhAA2AQwDOSxBgJKEbTtzAKAtqgBciJVCwwwyANw6uEBGawhocLCT2GTTy8hYduQMQoAAsYJQA6T1REAF5EaNtAqURpWUcoRHwsTSR4sFQAdzUNBBIAcgVyplsHMDMEgxj4tEwcbOISbNyaxAB6PsRAAHNACb9Gw0RAejNTc19EQG8fQGj1QBC3IA

### 编写一个泛型函数，将两个对象合并为一个新的对象。

问题

```ts
function mergeObjects(obj1, obj2) {
    // ...
}
const results = mergeObjects({ a: 1 }, { b: '2' }); // { a: 1, b: '2' }
```

答案

```ts
function mergeObjects<T, U>(obj1: T, obj2: U): T & U {
    return { ...obj1, ...obj2 };
}
```

### 编写一个泛型函数，将数组中的元素转换为指定类型。

```ts
function mapToType<T, U>(arr: T[], converter: (item: T) => U): U[] {
    return arr.map(converter);
}
```

### 编写一个泛型函数，将函数的返回值缓存起来，避免重复计算。


问题

```ts
// 编写一个函数，将函数的返回值缓存起来，避免重复计算。
function memoize(fn) {
}


function test(value: number) {
    return value * 2;
} 

const memozeTest = memoize(test);

memozeTest(1); // 2
memozeTest(1); // 2
```

答案

```ts
function memoize<T, U>(fn: (arg: T) => U): (arg: T) => U {
    const cache = new Map<T, U>();
    return arg => {
        if (cache.has(arg)) {
        return cache.get(arg);
        }
        const result = fn(arg);
        cache.set(arg, result);
        return result;
    };
}
```

### 实现 PromiseAll 方法

问题

```ts
function promiseAll(values) {
    // 补全此处代码，使用 Promise.all 以外的语法完成
}

promiseAll([
    Promise.resolve(1),
    Promise.resolve('a'),
]).then(([first, second]) => {
    console.log(first.toFixed(2));
    console.log(second.substring(0));
})
```

题解

```ts

function promiseAll<T extends unknown[] | []>(values: T): Promise<{ [P in keyof T]: Awaited<T[P]> }> {
    return new Promise((resolve, reject) => {
        const results: unknown[] = []
        values.forEach((value, index) => {
            return (value as Promise<unknown>).then((result) => {
                results.push(result)
            }).catch(reject)
        })
    });
}

```


https://www.typescriptlang.org/play?ssl=11&ssc=1&pln=11&pc=3#code/GYVwdgxgLglg9mABABwE5wLYwM4FMCCANoQBQBuAhoSLtgJSIDeAUIm4gPQeKCmEYBaKgE2tAIJqBjuUCAHoBh-wP7ygCldEABXRY8AOiqFEgU7lAaJqAQt0C30YFWbQDHagBCNmAX2bM0mHAWIkA2qwVL7K1LTiEyuEgCMdAA0rop2ql7YPn4kAOQUcSHMALp0KlAAFrhgJM7AMKjYUMGIeBAIACZpiAC8AHxMrmwVYNGEuCqEcADmJAVFUBlwAGIwAB64lSQATHR0ANzNiK3tnd195VUq2CAARsWoMGB9AAzzSxZ0QA

## 参考文献

- [TypeScript面试题总结](https://segmentfault.com/a/1190000040403067)
