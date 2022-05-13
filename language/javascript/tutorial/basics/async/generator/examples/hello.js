function* gen() {
  console.log(0);
  yield 1;
  console.log(1);
  yield 2;
  console.log(2);
  yield 3;
  console.log(3);
  return "...";
}

let g = gen();

console.log(">>", 0);
console.log(">>", g.next());
console.log(">>", g.next());
console.log(">>", g.next());
console.log(">>", g.next());
console.log(">>", g.next());
