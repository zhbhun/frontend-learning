"use strict";

require("core-js/modules/es6.regexp.constructor");

/* Keep the matching position sticky between matches and this way support efficient parsing of arbitrary long input strings, even with an arbitrary number of distinct regular expressions. */
var parser = function parser(input, match) {
  for (var pos = 0, lastPos = input.length; pos < lastPos;) {
    for (var i = 0; i < match.length; i++) {
      match[i].pattern.lastIndex = pos;
      var found = void 0;

      if ((found = match[i].pattern.exec(input)) !== null) {
        match[i].action(found);
        pos = match[i].pattern.lastIndex;
        break;
      }
    }
  }
};

var report = function report(match) {
  console.log(JSON.stringify(match));
};

parser('Foo 1 Bar 7 Baz 42', [{
  pattern: new RegExp("Foo\\s+(\\d+)", "y"),
  action: function action(match) {
    return report(match);
  }
}, {
  pattern: new RegExp("Bar\\s+(\\d+)", "y"),
  action: function action(match) {
    return report(match);
  }
}, {
  pattern: new RegExp("Baz\\s+(\\d+)", "y"),
  action: function action(match) {
    return report(match);
  }
}, {
  pattern: new RegExp("\\s*", "y"),
  action: function action(match) {}
}]);