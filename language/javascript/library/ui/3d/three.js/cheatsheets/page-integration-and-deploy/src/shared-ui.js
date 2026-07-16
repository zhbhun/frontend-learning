export function readElement(id) {
  const element = document.getElementById(id);

  if (!element) {
    throw new Error(`找不到页面元素：${id}`);
  }

  return element;
}

export function writeText(id, value) {
  readElement(id).textContent = String(value);
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

export function bindSelect(id, onChange) {
  const select = readElement(id);

  function commit() {
    onChange(select.value);
  }

  select.addEventListener('change', commit);
  commit();
}

export function bindCheckbox(id, onChange) {
  const input = readElement(id);

  function commit() {
    onChange(input.checked);
  }

  input.addEventListener('change', commit);
  commit();
}

export function bindButton(id, onClick) {
  readElement(id).addEventListener('click', onClick);
}

export function formatNumber(value, digits = 0) {
  return Number.isFinite(value) ? value.toFixed(digits) : '-';
}

export function formatSize(width, height) {
  return `${Math.round(width)} x ${Math.round(height)}`;
}
