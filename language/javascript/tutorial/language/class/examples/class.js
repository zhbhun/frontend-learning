class Person {
  constructor(name) {
    this.name = name;
    console.log(">> person", "constructor");
  }

  print() {
    console.log(">> person", this.name);
  }
}

class Teacher extends Person {
  constructor(name, school) {
    super(name); // 必须优先调用，否则会抛出异常：ReferenceError: Must call super constructor in derived class before accessing 'this' or returning from derived constructor
    this.name = name;
    this.school = school;
    console.log(">> teacher", "constructor");
  }

  print() {
    console.log(">> teacher", this.name, this.school);
  }
}

const teacher = new Teacher("张三", "幼儿园");
console.log(teacher.print());
