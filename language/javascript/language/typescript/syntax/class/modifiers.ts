// public
(function () {
  class Animal {
    public name: string;
    public constructor(theName: string) { this.name = theName; }
    public move(distanceInMeters: number) {
      console.log(`${this.name} moved ${distanceInMeters}m.`);
    }
  }
})();

// private
(function () {
  class Animal {
    private name: string;
    constructor(theName: string) { this.name = theName; }
  }

  new Animal("Cat").name; // Error: 'name' is private;
})();

// compatible
(function () {
  class Animal {
    private name: string;
    constructor(theName: string) { this.name = theName; }
  }

  class Rhino extends Animal {
    constructor() { super("Rhino"); }
  }

  class Employee {
    private name: string;
    constructor(theName: string) { this.name = theName; }
  }

  let animal = new Animal("Goat");
  let rhino = new Rhino();
  let employee = new Employee("Bob");

  animal = rhino;
  animal = employee; // Error: 'Animal' and 'Employee' are not compatible
})();

// protected
(function () {
  class Person {
    protected name: string;
    constructor(name: string) { this.name = name; }
  }

  class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
      super(name);
      this.department = department;
    }

    public getElevatorPitch() {
      return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
  }

  let howard = new Employee("Howard", "Sales");
  console.log(howard.getElevatorPitch());
  console.log(howard.name); // error
})();

// protected
(function () {
  class Person {
    protected name: string;
    protected constructor(theName: string) { this.name = theName; }
  }

  // Employee can extend Person
  class Employee extends Person {
    private department: string;

    constructor(name: string, department: string) {
      super(name);
      this.department = department;
    }

    public getElevatorPitch() {
      return `Hello, my name is ${this.name} and I work in ${this.department}.`;
    }
  }

  let howard = new Employee("Howard", "Sales");
  let john = new Person("John"); // Error: The 'Person' constructor is protected
})();

// readonly
(function () {
  class Octopus {
    readonly name: string;
    readonly numberOfLegs: number = 8;
    constructor(theName: string) {
      this.name = theName;
    }
  }
  let dad = new Octopus("Man with the 8 strong legs");
  dad.name = "Man with the 3-piece suit"; // error! name is readonly.
})();

// parameter
(function () {
  class Octopus {
    readonly numberOfLegs: number = 8;
    constructor(readonly name: string) {
    }
  }
  Octopus.name = "Man with the 3-piece suit"; // error! name is readonly.
})();
