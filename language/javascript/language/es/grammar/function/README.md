- [什么时候你不能使用箭头函数？](https://zhuanlan.zhihu.com/p/26540168)

# 语法
- [The Many Faces of Functions in JavaScript](https://bocoup.com/blog/the-many-faces-of-functions-in-javascript)

```javascript
// Function API
new Function('x', 'y', 'return x ** y;');

// Function Declaration
function BindingIdentifier() {}

// Named Function Expression
// (BindingIdentifier is not accessible outside of this function)
(function BindingIdentifier() {});

// Anonymous Function Expression
(function() {});

// Method Definitions
{
  propertyName: function() {},
  // (BindingIdentifier is not accessible outside of this function)
  propertyName: function BindingIdentifier() {},
};

//  ES5 accessor property definitions
{
  get propertyName() {},
  set propertyName(value) {},
};

// ES2015 literal property name
{
  propertyName() {},
  ["computedName"]() {},
  get ["computedAccessorName"]() {},
  set ["computedAccessorName"](value) {},
};

// Class Declaration
class C {
  static methodName() {}
  static ["computedName"]() {}
  static get ["computedAccessorName"]() {}
  static set ["computedAccessorName"](value) {}
  methodName() {}
  ["computedName"]() {}
  get ["computedAccessorName"]() {}
  set ["computedAccessorName"](value) {}
}

// Arrow Functions
(() => 2 ** 2);
(x => x ** 2);
(x => { return x ** 2; });
((x, y) => x ** y);

// Generator Declaration
function *BindingIdentifer() {}

// Async Functions
async function BindingIdentifier() { /**/ }
```

