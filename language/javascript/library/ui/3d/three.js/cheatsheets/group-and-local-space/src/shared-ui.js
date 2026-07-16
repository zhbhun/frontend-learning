export function readElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`找不到页面元素：${id}`);
  }

  return element;
}

export function writeText(id, value) {
  readElement(id).textContent = value;
}

export function bindRange(inputId, outputId, format, onChange) {
  const input = readElement(inputId);
  const output = readElement(outputId);

  function commit() {
    const value = Number(input.value);
    output.value = format(value);
    onChange(value);
  }

  input.addEventListener('input', commit);
  commit();
}

export function bindCheckbox(inputId, onChange) {
  const input = readElement(inputId);

  function commit() {
    onChange(input.checked);
  }

  input.addEventListener('change', commit);
  commit();
}
