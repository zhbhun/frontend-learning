# 面试

## 笔试题

- 编写一个泛型函数，获取对象中指定属性的值

    - 问题

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

    - 答案

        ```ts
        function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
            return obj[key];
        }
        ```

- 编写一个泛型函数，将两个对象合并为一个新的对象。

    - 问题

        ```ts
        function mergeObjects(obj1, obj2) {
            // ...
        }
        const results = mergeObjects({ a: 1 }, { b: '2' }); // { a: 1, b: '2' }
        ```

    - 答案

        ```ts
        function mergeObjects<T, U>(obj1: T, obj2: U): T & U {
            return { ...obj1, ...obj2 };
        }
        ```

- 编写一个泛型函数，将数组中的元素转换为指定类型。

    ```ts
    function mapToType<T, U>(arr: T[], converter: (item: T) => U): U[] {
        return arr.map(converter);
    }
    ```

- 编写一个泛型函数，将函数的返回值缓存起来，避免重复计算。

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

## 参考文献

- [TypeScript面试题总结](https://segmentfault.com/a/1190000040403067)
