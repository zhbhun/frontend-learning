// ## Object Static Method
// -----------------------------------------------------------------------------

// Object.create
Object.create({});

// Object.defineProperty
Object.defineProperty({}, "key", {
  enumerable: false,
  configurable: false,
  writable: false,
  value: "static"
});

// Object.defineProperties
Object.defineProperties({}, {
  "property1": {
    value: true,
    writable: true
  },
  "property2": {
    value: "Hello",
    writable: false
  }
  // etc. etc.
});

// Object.getPrototypeOf
Object.getPrototypeOf({})


// Object.assign
Object.assign({}, { age: 30 });

// Object.keys
Object.keys({});

// Object.seal
Object.seal({});

// Object.freeze
Object.freeze({});

// Object.preventExtensions
Object.preventExtensions({});

// Object.isSealed
Object.isSealed({});

// Object.isFrozen
Object.isFrozen({});

// Object.isExtensible
Object.isExtensible({});

// Object.getOwnPropertyDescriptor
Object.getOwnPropertyDescriptor({}, 'key');

// Object.getOwnPropertyNames
Object.getOwnPropertyNames({});

