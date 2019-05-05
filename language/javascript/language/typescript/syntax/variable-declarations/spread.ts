// Array
(function () {
  let first = [1, 2];
  let second = [3, 4];
  let bothPlus = [0, ...first, ...second, 5];
})();

// Object

(function () {
  let defaults = { food: "spicy", price: "$$", ambiance: "noisy" };
  let search1 = { ...defaults, food: "rich" };
  let search2 = { food: "rich", ...defaults };
})();

// Limit
(function () {
  class C {
    p = 12;
    m() {
    }
  }
  let c = new C();
  let clone = { ...c };
  clone.p; // ok
  clone.m(); // error!
})()
