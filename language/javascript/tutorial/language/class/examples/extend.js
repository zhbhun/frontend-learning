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
  const child1 = extend(parent);
  child1.works.push("programmer");
  const child2 = extend(parent);
  child2.works.push("...");
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
})();

// babel loose
(function () {
  console.log(">> babel loose");

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    _setPrototypeOf(subClass, superClass);
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
})();

// babel
(function () {
  console.log(">> babel");
  ("use strict");

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }
    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: { value: subClass, writable: true, configurable: true },
    });
    Object.defineProperty(subClass, "prototype", { writable: false });
    if (superClass) _setPrototypeOf(subClass, superClass);
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

  function _createSuper(Derived) {
    var hasNativeReflectConstruct = _isNativeReflectConstruct();
    return function _createSuperInternal() {
      var Super = _getPrototypeOf(Derived),
        result;
      if (hasNativeReflectConstruct) {
        var NewTarget = _getPrototypeOf(this).constructor;
        result = Reflect.construct(Super, arguments, NewTarget);
      } else {
        result = Super.apply(this, arguments);
      }
      return _possibleConstructorReturn(this, result);
    };
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (typeof call === "object" || typeof call === "function")) {
      return call;
    } else if (call !== void 0) {
      throw new TypeError(
        "Derived constructors may only return object or undefined"
      );
    }
    return _assertThisInitialized(self);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError(
        "this hasn't been initialised - super() hasn't been called"
      );
    }
    return self;
  }

  function _isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;
    try {
      Boolean.prototype.valueOf.call(
        Reflect.construct(Boolean, [], function () {})
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf
      ? Object.getPrototypeOf
      : function _getPrototypeOf(o) {
          return o.__proto__ || Object.getPrototypeOf(o);
        };
    return _getPrototypeOf(o);
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", { writable: false });
    return Constructor;
  }

  var Parent = /*#__PURE__*/ (function () {
    function Parent(work) {
      _classCallCheck(this, Parent);

      this.works = [work];
    }

    _createClass(Parent, [
      {
        key: "toString",
        value: function toString() {
          return this.works.join(", ");
        },
      },
    ]);

    return Parent;
  })();

  var Child = /*#__PURE__*/ (function (_Parent) {
    _inherits(Child, _Parent);

    var _super = _createSuper(Child);

    function Child(work) {
      _classCallCheck(this, Child);

      return _super.call(this, work);
    }

    return _createClass(Child);
  })(Parent);
  const child = new Child("");
  console.log(child instanceof Child); // true
  console.log(child instanceof Parent); // true
  const child1 = new Child("teacher");
  child1.works.push("programmer");
  console.log(child1.toString()); // teacher', 'programmer'
  const child2 = new Child("painter");
  console.log(child2.toString()); // 'painter'
})();
