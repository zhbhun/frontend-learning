function fibonacci(n) {
  let t, a = 0, b = 1;
  for (let i = 0; i < n; i++) {
    t = a + b;
    a = b;
    b = t;
  }
  return b;
}
