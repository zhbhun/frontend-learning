"use strict";

require("core-js/modules/es6.object.freeze");

require("core-js/modules/es6.string.raw");

function _templateObject3() {
  var data = _taggedTemplateLiteral(["foo\n", "bar"], ["foo\\n", "bar"]);

  _templateObject3 = function _templateObject3() {
    return data;
  };

  return data;
}

function _templateObject2() {
  var data = _taggedTemplateLiteral(["foo\n", "bar"], ["foo\\n", "bar"]);

  _templateObject2 = function _templateObject2() {
    return data;
  };

  return data;
}

function _templateObject() {
  var data = _taggedTemplateLiteral(["http://example.com/foo?bar=", "&quux=", ""]);

  _templateObject = function _templateObject() {
    return data;
  };

  return data;
}

function _taggedTemplateLiteral(strings, raw) { if (!raw) { raw = strings.slice(0); } return Object.freeze(Object.defineProperties(strings, { raw: { value: Object.freeze(raw) } })); }

/* Intuitive expression interpolation for single-line and multi-line strings. (Notice: don't be confused, Template Literals were originally named "Template Strings" in the drafts of the ECMAScript 6 language specification) */
var customer = {
  name: 'Foo'
};
var card = {
  amount: 7,
  product: 'Bar',
  unitprice: 42
};
var message = "Hello ".concat(customer.name, ",\nwant to buy ").concat(card.amount, " ").concat(card.product, " for\na total of ").concat(card.amount * card.unitprice, " bucks?");
/* Flexible expression interpolation for arbitrary methods. */

var bar = 'a';
var baz = 'b';
var quux = 'c';
get(_templateObject(), bar + baz, quux);
/* Access the raw template string content (backslashes are not interpreted). */

function quux(strings) {
  strings[0] === 'foo\n';
  strings[1] === 'bar';
  strings.raw[0] === 'foo\\n';
  strings.raw[1] === 'bar';
  (arguments.length <= 1 ? undefined : arguments[1]) === 42;
}

quux(_templateObject2(), 42);
String.raw(_templateObject3(), 42) === 'foo\\n42bar';