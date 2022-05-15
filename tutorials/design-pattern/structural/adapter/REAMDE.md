# 原型模式

原型模式是一种创建型设计模式，使你能够复制已有对象，而又无需使代码依赖它们所属的类。

![prototype.png](./prototype.png)

使用场景

- 如果你需要复制一些对象， 同时又希望代码独立于这些对象所属的具体类，可以使用原型模式。
- 如果子类的区别仅在于其对象的初始化方式，那么你可以使用该模式来减少子类的数量。 别人创建这些子类的目的可能是为了创建特定类型的对象。

优缺点

- 优点

    - 你可以克隆对象， 而无需与它们所属的具体类相耦合。
    - 你可以克隆预生成原型， 避免反复运行初始化代码。
    - 你可以更方便地生成复杂对象。
    - 你可以用继承以外的方式来处理复杂对象的不同配置。

缺点

    - 克隆包含循环引用的复杂对象可能会非常麻烦。

## 实现

```ts
/**
 * The example class that has cloning ability. We'll see how the values of field
 * with different types will be cloned.
 */
class Prototype {
    public primitive: any;
    public component: object;
    public circularReference: ComponentWithBackReference;

    public clone(): this {
        const clone = Object.create(this);

        clone.component = Object.create(this.component);

        // Cloning an object that has a nested object with backreference
        // requires special treatment. After the cloning is completed, the
        // nested object should point to the cloned object, instead of the
        // original object. Spread operator can be handy for this case.
        clone.circularReference = {
            ...this.circularReference,
            prototype: { ...this },
        };

        return clone;
    }
}

class ComponentWithBackReference {
    public prototype;

    constructor(prototype: Prototype) {
        this.prototype = prototype;
    }
}

/**
 * The client code.
 */
function clientCode() {
    const p1 = new Prototype();
    p1.primitive = 245;
    p1.component = new Date();
    p1.circularReference = new ComponentWithBackReference(p1);

    const p2 = p1.clone();
    if (p1.primitive === p2.primitive) {
        console.log('Primitive field values have been carried over to a clone. Yay!');
    } else {
        console.log('Primitive field values have not been copied. Booo!');
    }
    if (p1.component === p2.component) {
        console.log('Simple component has not been cloned. Booo!');
    } else {
        console.log('Simple component has been cloned. Yay!');
    }

    if (p1.circularReference === p2.circularReference) {
        console.log('Component with back reference has not been cloned. Booo!');
    } else {
        console.log('Component with back reference has been cloned. Yay!');
    }

    if (p1.circularReference.prototype === p2.circularReference.prototype) {
        console.log('Component with back reference is linked to original object. Booo!');
    } else {
        console.log('Component with back reference is linked to the clone. Yay!');
    }
}

clientCode();
```

## 应用

- 使用克隆的原型模式
- 原型链继承：原型模式是一种设计模式，也是一种编程泛型，它构成了 JavaScript 这门语言的根本。

    - `Object.create`

- 原型注册表

    ![prototype-register.png](./prototype-register.png)
