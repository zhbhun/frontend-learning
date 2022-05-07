// # 确定原型和实例的关系
(function () {
  console.log(">> 确定原型和实例的关系");
  const instance = {};
  console.log(
    1,
    Object.getPrototypeOf(instance) === Object.prototype,
    instance.__proto__ === Object.prototype
  );
  console.log(
    2,
    instance.constructor === Object,
    Object.getPrototypeOf(instance).constructor === Object
  );
  console.log(
    3,
    instance instanceof Object,
    Object.prototype.isPrototypeOf(instance)
  );
  function Temp() {}
  Temp.prototype = Object.prototype;
  console.log(
    4,
    Object.getPrototypeOf(instance) === Temp.prototype,
    instance.__proto__ === Temp.prototype
  );
  console.log(
    5,
    instance.constructor === Temp,
    Object.getPrototypeOf(instance).constructor === Temp
  );
  console.log(
    6,
    instance instanceof Temp,
    Temp.prototype.isPrototypeOf(instance)
  );

  // instance 可以用于检测函数是否以构造函数的形式调用
  (function () {
    function F() {
      console.log(7, this instanceof arguments.callee, arguments.callee === F);
    }
    F();
    new F();
  })();
})();

// new 运算符
(function () {
  console.log(">> new 运算符");
  function MyObject(age) {
    this.age = age;
  }

  MyObject.construct = function () {
    const o = {};
    const Constructor = MyObject;
    o.constructor = Constructor;
    Object.setPrototypeOf(o, Constructor.prototype);
    Constructor.apply(o, arguments);
    return o;
  };

  const obj1 = new MyObject(10);
  const obj2 = MyObject.construct(10);
  console.log(1, obj1 instanceof MyObject);
  console.log(2, obj2 instanceof MyObject);
})();

// 原型继承
(function () {
  console.log(">> 原型继承");
  function extend(parent) {
    function F() {}
    F.prototype = parent;
    return new F();
  }
  const parent = {
    works: ["teacher"],
  };
  const son1 = extend(parent);
  son1.works.push("programmer");
  const son2 = extend(parent);
  son2.works.push("...");
  console.log(parent.works); // 'teacher', 'programmer', '...'
})();

// 借用构造函数继承
(function () {
  console.log(">> 借用构造函数继承");
  function Parent(work) {
    this.works = [work];
    this.toString = () => {
      return this.works.join(", ");
    };
  }
  function Son(work) {
    Parent.call(this, work);
  }
  const son = new Son("");
  console.log(son instanceof Son); // true
  console.log(son instanceof Parent); // false
  const son1 = new Son("teacher");
  son1.works.push("programmer");
  console.log(son1.toString()); // teacher', 'programmer'
  const son2 = new Son("painter");
  console.log(son2.toString()); // 'painter'
})();

// 组合继承
(function () {
  console.log(">> 组合继承");
  function Parent(work) {
    this.works = [work];
  }
  Parent.prototype.toString = function () {
    return this.works.join(", ");
  };
  function Son(work) {
    Parent.call(this, work);
  }
  Son.prototype = new Parent();
  const son = new Son("");
  console.log(son instanceof Son); // true
  console.log(son instanceof Parent); // true
  const son1 = new Son("teacher");
  son1.works.push("programmer");
  console.log(son1.toString()); // teacher', 'programmer'
  const son2 = new Son("painter");
  console.log(son2.toString()); // 'painter'
})();

// 寄生式继承
(function () {
  console.log(">> 寄生式继承");
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
})();

// 寄生组合式继承
(function () {
  console.log(">> 寄生组合式继承");
  function extend1(childClass, parentClass) {
    // 通过寄生式继承来避免父类构造函数重复调用
    const prototype = Object.create(parentClass.prototype);
    prototype.constructor = childClass;
    childClass.prototype = prototype;
  }
  function extend2(childClass, parentClass) {
    // 通过创建一个空方法类避免父类构造函数重复调用
    var F = function () {};
    F.prototype = parentClass.prototype;
    childClass.prototype = new F();
    childClass.prototype.constructor = childClass;

    childClass.superclass = parentClass.prototype;
    if (parentClass.prototype.constructor === Object.prototype.constructor) {
      parentClass.prototype.constructor = parentClass;
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
})();
