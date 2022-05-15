# 单例模式

单例是一种创建型设计模式， 让你能够保证一个类只有一个实例， 并提供一个访问该实例的全局节点。

![singleton.png](./singleton.png)

应用场景

- 如果程序中的某个类对于所有客户端只有一个可用的实例，可以使用单例模式。
- 如果你需要更加严格地控制全局变量，可以使用单例模式。

优缺点：TODO

## 实现

### 标准版

```ts
/**
 * The Singleton class defines the `getInstance` method that lets clients access
 * the unique singleton instance.
 */
class Singleton {
    private static instance: Singleton;

    /**
     * The Singleton's constructor should always be private to prevent direct
     * construction calls with the `new` operator.
     */
    private constructor() { }

    /**
     * The static method that controls the access to the singleton instance.
     *
     * This implementation let you subclass the Singleton class while keeping
     * just one instance of each subclass around.
     */
    public static getInstance(): Singleton {
        if (!Singleton.instance) {
            Singleton.instance = new Singleton();
        }

        return Singleton.instance;
    }

    /**
     * Finally, any singleton should define some business logic, which can be
     * executed on its instance.
     */
    public someBusinessLogic() {
        // ...
    }
}

/**
 * The client code.
 */
function clientCode() {
    const s1 = Singleton.getInstance();
    const s2 = Singleton.getInstance();

    if (s1 === s2) {
        console.log('Singleton works, both variables contain the same instance.');
    } else {
        console.log('Singleton failed, variables contain different instances.');
    }
}

clientCode();
```

ps：标准的单例模式，增加了类的“不透明性，Singleton 类的使用者必须知道这是一个单例类，跟以往通过 new XXX 的方式来获取对象不同，这里偏要使用 Singleton.getInstance 来获取对象。

### 透明的单例

```ts
class Singleton {
  private static instance: Singleton;
  constructor() {
    if (Singleton.instance) {
      return Singleton.instance
    }
    Singleton.instance = this;
  }
  public someBusinessLogic() {
    // ...
  }
}
```

闭包版本

```js

const Singleton = (function () {
  let instance;
  const SingletonConstructor = function () {
    if (instance) {
      return instance;
    }
    instance = this;
  };
  SingletonConstructor.prototype.someBusinessLogic = function () {
    // ...
  };
})();
```

ps：这种方式的构造函数干了两件事，第一是创建对象和执行初始化 init 方法，第二是保证只有一个对象，这不符合单一责任原则。

### 用代理实现单例模式

```js
function Singleton() {}
Singleton.prototype.someBusinessLogic = function () {
  // ...
};
const ProxySingleton = (function () {
  let instance;
  return function () {
    if (!instance) {
      instance = new Singleton();
    }
    return instance;
  };
})();
```

单例模式创建工具

```js
function createProxySingleton(singleton) {
  let instance;
  return function (...args) {
    if (!instance) {
      instance = new Singleton(...args);
    }
    return instance;
  };
}
function Singleton() {}
Singleton.prototype.someBusinessLogic = function () {
  // ...
};
const ProxySingleton = createProxySingleton(Singleton);
```

## 应用

### 全局变量的命名污染

在 JavaScript 中创建对象的方法非常简单，很多全局变量都是单例的，例如：window、navigator 等对象在每个网页中都是单例的。但是全局变量存在很多问题，它很容易造成命名空间污染。在大中型项目中，如果不加以限制和管理，程序中可能存在很多这样的变量。作为普通的开发者，我们有必要尽量减少全局变量的使用，即使需要，也要把它的污染降到最低。以下几种方式可以相对降低全局变量带来的命名污染。

- 使用命名空间

    ```js
        const MyApp = {};
    MyApp.namespace = function (name) {
      const parts = name.split('.');
      let current = MyApp;
      for (let i in parts) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
    };
    MyApp.namespace('event');
    MyApp.namespace('dom.style');
    ```

- 使用闭包封装私有变量：参照上文“透明的单例”。

### 惰性单例

全局变量在声明的时候就初始化了，而惰性单例指的是在需要的时候才创建对象实例。
