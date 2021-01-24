(async () => {
  const fetchPromise = fetch('fibonacci.wasm');
  const { instance } = await WebAssembly.instantiateStreaming(fetchPromise);
  const result = instance.exports.fibonacci(42);
  document.querySelector(
    "main"
  ).textContent = `The 42nd Fibonacci number is ${result}.`;
})();
