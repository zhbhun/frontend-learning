// ## 原子类型

/**
 * @type {string}
 */
var s;
/**
 * @type {?number}
 * With strictNullChecks: true  -- number | null
 *
 * With strictNullChecks: false -- number
 */
var nullable;
/**
 * @type {number | null}
 * With strictNullChecks: true  -- number | null
 * With strictNullChecks: false -- number
 */
var unionNullable;

// ## 对象类型

/** @type {Window} */
var win;
/** @type {PromiseLike<string>} */
var promisedString;
// You can specify an HTML Element with DOM properties
/** @type {HTMLElement} */
var myElement = document.querySelector(selector);
element.dataset.myData = "";
/**
 * Use postfix question on the property name instead:
 * @type {{ a: string, b?: number }}
 */
var right;

// ## 或类型

/**
 * @type {(string | boolean)}
 */
var sb1;
/**
 * @type {string | boolean}
 */
var sb2;

// ## 数组类型

/** @type {number[]} */
var ns;
/** @type {Array.<number>} */
var nds;
/** @type {Array<number>} */
var nas;

// ## Map 类型

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

// ## 函数类型

/** @type {function(string, boolean): number} Closure syntax */
var sbn;
/** @type {(s: string, b: boolean) => number} TypeScript syntax */
var sbn2;

// ## 任意类型

/**
 * @type {*} - can be 'any' type
 */
var star;
/**
 * @type {?} - unknown type (same as 'any')
 */
var question;

// ## 类型推导
function aNormalFunction() {}
/**
 * Use 'typeof' instead:
 * @type {typeof aNormalFunction}
 */
var right;
