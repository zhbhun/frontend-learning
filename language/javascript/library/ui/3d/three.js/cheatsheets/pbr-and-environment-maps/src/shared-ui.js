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

export function bindRange(id, onInput, { immediate = true, format = (value) => value.toFixed(2) } = {}) {
  const input = readElement(id);
  const output = document.getElementById(`${id}-value`);

  function commit() {
    const value = Number(input.value);

    if (output) {
      output.textContent = format(value);
    }

    onInput(value);
  }

  input.addEventListener('input', commit);

  if (immediate) {
    commit();
  }

  return input;
}

export function bindSelect(id, onChange, { immediate = true } = {}) {
  const select = readElement(id);

  function commit() {
    onChange(select.value);
  }

  select.addEventListener('change', commit);

  if (immediate) {
    commit();
  }

  return select;
}

export function bindColor(id, onChange, { immediate = true } = {}) {
  const input = readElement(id);

  function commit() {
    onChange(input.value);
  }

  input.addEventListener('input', commit);

  if (immediate) {
    commit();
  }

  return input;
}
