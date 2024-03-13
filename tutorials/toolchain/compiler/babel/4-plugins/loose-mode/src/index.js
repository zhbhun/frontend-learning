class Animal {

  constructor(name) {
    this.name = name;
  }

  say() {
    console.log('...');
  }

}

class Dog extends Animal {

  constructor(name) {
    super(name);
  }

  say() {
    super.say();
  }

}

class Cat extends Animal {

  constructor(name) {
    super(name);
  }

  say() {
    console.log(this.name + ' miaow');
  }

}

var dog = new Dog('dog');
var cat = new Cat('cat');
dog.say(); // ...
cat.say(); // miaow
