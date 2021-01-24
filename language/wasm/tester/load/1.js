(async () => {
  const response = await fetch('fibonacci.wasm');
  const buffer = await response.arrayBuffer();
  const module = new WebAssembly.Module(buffer);
  const instance = new WebAssembly.Instance(module);
  const result = instance.exports.fibonacci(42);
  document.querySelector(
    "main"
  ).textContent = `The 42nd Fibonacci number is ${result}.`;
})();
