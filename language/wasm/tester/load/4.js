(async () => {
  const response = await fetch('fibonacci.wasm');
  const module = await WebAssembly.compileStreaming(response);
  const instance = await WebAssembly.instantiate(module);
  const result = instance.exports.fibonacci(42);
  document.querySelector(
    "main"
  ).textContent = `The 42nd Fibonacci number is ${result}.`;
})();
