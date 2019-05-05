(function () {
  interface StringArray {
    [index: number]: string;
  }

  let myArray: StringArray;
  myArray = ["Bob", "Fred"];

  let myStr: string = myArray[0];
})();

// There are two types of supported index signatures: string and number.
//  It is possible to support both types of indexers, but the type returned from a numeric indexer must be a subtype of the type returned from the string indexer.
// This is because when indexing with a number, JavaScript will actually convert that to a string before indexing into an object.
(function () {
  class Animal {
    name: string;
  }
  class Dog extends Animal {
    breed: string;
  }

  interface Okay {
    [x: string]: Animal;
    [x: number]: Dog;
  }
  // Error: indexing with a 'string' will sometimes get you a Dog!
  interface NotOkay {
    [x: number]: Animal;
    [x: string]: Dog;
  }
})();

(function () {
  interface NumberDictionary {
    [index: string]: number;
    length: number;    // ok, length is a number
    name: string;      // error, the type of 'name' is not a subtype of the indexer
  }
})();

(function () {
  interface ReadonlyStringArray {
    readonly [index: number]: string;
  }
  let myArray: ReadonlyStringArray = ["Alice", "Bob"];
  myArray[2] = "Mallory"; // error!
})();
