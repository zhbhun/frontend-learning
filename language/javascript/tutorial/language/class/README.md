# 类

## 原型链

如果试图引用对象实例的某个属性，会首先在对象内部寻找该属性，找不到的话才在该对象的原型里去找这个属性，在原型里找不到的再从原型的原型里去找，直至找到或者最上层的原型。

### 构造函数、原型和实例关系

- 每个构造函数 constructor 都有一个指向原型对象的属性 prototype，
- 每个原型对象 prototype 都有一个指向构造函数的属性 constructor
- 每个实例对象都有一个指向构造函数的属性 constructor 和一个指向原型对象的属性 __proto__

判断实例是否是属于某个构造函数或原型的，可以通过以下方式判断：

- `instance instanceof Object`
- `Object.prototype.isPrototypeOf(instance)`

ps：`instance instanceof Object` 满足的条件是 Object 的 prototype 属性是否是 instance 原型链上的某个原型，即使 instance 不是某个函数构建的，只要这个函数的 prototype 属性也在其原型链上，那么该实例也是属于该函数的实例。

### new 运算符

语法：new 后必须跟一个对象并且此对象必须有一个名为 [[Construct]] 的内部方法（其实这种对象就是构造器），否则会抛出异常。

原理：

```js
function CustomObject() {}
CustomObject.construct = function () {
  // 1. 创建对象实例
  const instance = {};
  // 2. 修改实例的构造函数和原型
  instance.constructor = CustomObject;
  Object.setPrototypeOf(instance, CustomObject.prototype);
  // 3. 调用构造函数
  CustomObject.apply(instance, arguments);
  return instance
}
console.log(new MyObject() instanceof MyObject); // true
console.log(MyObject.construct() instanceof MyObject); // true
```

## 继承

要点：

1. 存在父子类型，子类型创建的实例既属于子类型，又属于父类型；
1. 在创建子类型时能够向父类型的构造函数传递参数；
2. 父类型的引用类型值在每个子类型实例里都是独立创建的，不能共享；

### 原型继承

简介：该方法最初由道格拉斯·克罗克福德于 2006 年在一篇题为 《Prototypal Inheritance in JavaScript》的文章中提出。他的想法是**借助原型可以基于已有的对象创建新对象，同时还不必因此创建自定义类型**。

用法：

```js
function extend(parent){
  function F(){}
  F.prototype = parent;
  return new F();
}
const parent = {
  works: ['teacher'],
};
const child1 = extend(parent);
child1.works.push('programmer');
const child2 = extend(parent);
child2.works.push('...');
console.log(parent.works); // [ 'teacher', 'programmer', '...' ]
```

总结：原型继承存在数据共享问题，且由于不存在自定义类型，只能算是借用原型继承实现的代码复用逻辑。

- `Object.create(null)`：创建的对象更加轻量，且避免受全局对象 Object 的原型被污染影响；

    [详解Object.create(null)](https://zhuanlan.zhihu.com/p/85308798)

- ...

### 借用构造函数继承

简介：在子类型构造函数的内部调用超类型构造函数.

用法：

```js
function Parent(work) {
  this.works = [work];
  this.toString = () => {
    return this.works.join(", ");
  };
}
function Child(work) {
  Parent.call(this, work);
}
const child = new Child("");
console.log(child instanceof Child); // true
console.log(child instanceof Parent); // false
const child1 = new Child("teacher");
child1.works.push("programmer");
console.log(child1.toString()); // teacher', 'programmer'
const child2 = new Child("painter");
console.log(child2.toString()); // 'painter'
```

总结：

- 优点：

    - “借用构造函数继承”保证了原型链中引用类型值的独立，不再被所有实例共享；
    - 子类型也能够向父类型传递参数；

- 缺点：

    - 父类型的原型不在子类型实例的原型链上；
    - 方法都在构造函数中定义，每次创建实例都要重复创建；

### 组合继承

简介：组合继承, 有时候也叫做伪经典继承，指的是将原型链和借用构造函数的技术组合到一块，从而发挥两者之长的一种继承模式。

用法：使用原型链实现对原型属性和方法的继承,通过借用构造函数来实现对实例属性的继承。

```js
function Parent(work) {
  this.works = [work];
}
Parent.prototype.toString = function () {
  return this.works.join(", ");
};
function Child(work) {
  Parent.call(this, work);
}
Child.prototype = new Parent();
const child = new Child("");
console.log(child instanceof Child); // true
console.log(child instanceof Parent); // true
const child1 = new Child("teacher");
child1.works.push("programmer");
console.log(child1.toString()); // teacher', 'programmer'
const child2 = new Child("painter");
console.log(child2.toString()); // 'painter'
```

总结：在借用构造函数继承的基础上，解决了方法重复创建和父类原型的继承问题。但是，Parent 存在重复调用两次的问题。

### 寄生式继承

简介：寄生式继承的思路与(寄生)构造函数和工厂模式类似, 即创建一个仅用于封装继承过程的函数，该函数在内部以某种方式来增强对象，最后再像真的是它做了所有工作一样返回对象。

用法：

```js
function extend(parent) {
  const instance = Object.create(parent);
  instance.toJSON = function () {
    return JSON.stringify([instance.toString()]);
  };
  return instance;
}
const parent = {
  works: ["teacher"],
  toString() {
    return this.works.join(", ");
  },
};
const child = extend(parent);
console.log(parent.toString()); // teacher
console.log(child.toString()); // teacher
console.log(child.toJSON()); // ["teacher"]
```

总结：寄生式继承在原型继承基础上增强了原型对象，原型继承存在的问题寄生式继承也存在类似问题。

### 寄生组合式继承

简介：组合式继承 + 寄生式继承

用法：

```js
function extend1(subClass, superClass) {
  // 通过寄生式继承来避免父类构造函数重复调用
  const prototype = Object.create(superClass.prototype);
  prototype.constructor = subClass;
  subClass.prototype = prototype;
}
function extend2(subClass, superClass) {
  // 通过创建一个空方法类避免父类构造函数重复调用
  var F = function () {};
  F.prototype = superClass.prototype;
  subClass.prototype = new F();
  subClass.prototype.constructor = subClass;

  subClass.superclass = superClass.prototype;
  if (superClass.prototype.constructor === Object.prototype.constructor) {
    superClass.prototype.constructor = superClass;
  }
}
function Parent(work) {
  this.works = [work];
}
Parent.prototype.toString = function () {
  return this.works.join(", ");
};
function Child(work) {
  Parent.call(this, work);
}
extend1(Child, Parent); // extend2(Child, Parent) 效果也是类似的
const child = new Child("");
console.log(child instanceof Child); // true
console.log(child instanceof Parent); // true
const child1 = new Child("teacher");
child1.works.push("programmer");
console.log(child1.toString()); // teacher', 'programmer'
const child2 = new Child("painter");
console.log(child2.toString()); // 'painter'
```

总结：解决了组合式继承的构造函数重复调用问题，且满足继承的几个要点。

### babel

```js
function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass); // TODO: ???
}

function _setPrototypeOf(o, p) {
  _setPrototypeOf =
    Object.setPrototypeOf ||
    function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
  return _setPrototypeOf(o, p);
}

var Parent = /*#__PURE__*/ (function () {
  function Parent(work) {
    this.works = [work];
  }

  var _proto = Parent.prototype;

  _proto.toString = function toString() {
    return this.works.join(", ");
  };

  return Parent;
})();

var Child = /*#__PURE__*/ (function (_Parent) {
  _inheritsLoose(Child, _Parent);

  function Child(work) {
    return _Parent.call(this, work) || this;
  }

  return Child;
})(Parent);
const child = new Child("");
console.log(child instanceof Child); // true
console.log(child instanceof Parent); // true
const child1 = new Child("teacher");
child1.works.push("programmer");
console.log(child1.toString()); // teacher', 'programmer'
const child2 = new Child("painter");
console.log(child2.toString()); // 'painter'
```

## 参考

- [JS原型链与继承别再被问倒了](https://juejin.cn/post/6844903475021627400#heading-8)
