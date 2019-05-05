(function () {
  interface ClockInterface {
    currentTime: Date;
  }

  class Clock implements ClockInterface {
    currentTime: Date;
    constructor(h: number, m: number) { }
  }
})();

// describe methods in an interface that are implemented in the class
(function () {
  interface ClockInterface {
    currentTime: Date;
    setTime(d: Date);
  }

  class Clock implements ClockInterface {
    currentTime: Date;
    setTime(d: Date) {
      this.currentTime = d;
    }
    constructor(h: number, m: number) { }
  }
})();
// Interfaces describe the public side of the class, rather than both the public and private side. This prohibits you from using them to check that a class also has particular types for the private side of the class instance.

// Difference between the static and instance sides of classes
// When a class implements an interface, only the instance side of the class is checked. Since the constructor sits in the static side, it is not included in this check.
(function () {
  interface ClockConstructor {
    new (hour: number, minute: number);
  }

  class Clock implements ClockConstructor {
    currentTime: Date;
    constructor(h: number, m: number) { }
  }
})();

(function () {
  interface ClockConstructor {
    new (hour: number, minute: number): ClockInterface;
  }
  interface ClockInterface {
    tick();
  }

  function createClock(ctor: ClockConstructor, hour: number, minute: number): ClockInterface {
    return new ctor(hour, minute);
  }

  class DigitalClock implements ClockInterface {
    constructor(h: number, m: number) { }
    tick() {
      console.log("beep beep");
    }
  }
  class AnalogClock implements ClockInterface {
    constructor(h: number, m: number) { }
    tick() {
      console.log("tick tock");
    }
  }

  let digital = createClock(DigitalClock, 12, 17);
  let analog = createClock(AnalogClock, 7, 32);
})();
