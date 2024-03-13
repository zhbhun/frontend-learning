'use strict';

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }
  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var Animal = function () {
  function Animal(name) {
    _classCallCheck(this, Animal);

    this.name = name;
  }

  Animal.prototype.say = function say() {
    console.log('...');
  };

  return Animal;
}();

var Dog = function (_Animal) {
  _inherits(Dog, _Animal);

  function Dog(name) {
    _classCallCheck(this, Dog);

    return _possibleConstructorReturn(this, _Animal.call(this, name));
  }

  Dog.prototype.say = function say() {
    _Animal.prototype.say.call(this);
  };

  return Dog;
}(Animal);

var Cat = function (_Animal2) {
  _inherits(Cat, _Animal2);

  function Cat(name) {
    _classCallCheck(this, Cat);

    return _possibleConstructorReturn(this, _Animal2.call(this, name));
  }

  Cat.prototype.say = function say() {
    console.log(this.name + ' miaow');
  };

  return Cat;
}(Animal);

var dog = new Dog('dog');
var cat = new Cat('cat');
dog.say(); // ...
cat.say(); // miaow
