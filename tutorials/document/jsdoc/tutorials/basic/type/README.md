# `type`

## 基础

### 原子类型

```js
/**
 * @type {string}
 */
var s;
```

### 对象类型

```js
/** @type {Window} */
var win;
/** @type {PromiseLike<string>} */
var promisedString;
// You can specify an HTML Element with DOM properties
/** @type {HTMLElement} */
var myElement = document.querySelector(selector);
element.dataset.myData = "";
```

### 或类型

```js
/**
 * @type {(string | boolean)}
 */
var sb1;
/**
 * @type {string | boolean}
 */
var sb2;
```

### 数组类型

```js
/** @type {number[]} */
var ns;
/** @type {Array.<number>} */
var nds;
/** @type {Array<number>} */
var nas;
```

### Map 类型

```js
/** @type {{ a: string, b: number }} */
var var9;
/**
 * A map-like object that maps arbitrary `string` properties to `number`s.
 *
 * @type {Object.<string, number>}
 */
var stringToNumber;
/** @type {Object.<number, object>} */
var arrayLike;
```

### 函数类型

```js
/** @type {function(string, boolean): number} Closure syntax */
var sbn;
/** @type {(s: string, b: boolean) => number} TypeScript syntax */
var sbn2;
```

### 任意类型

```js
/**
 * @type {*} - can be 'any' type
 */
 var star;
 /**
  * @type {?} - unknown type (same as 'any')
  */
 var question;
```
