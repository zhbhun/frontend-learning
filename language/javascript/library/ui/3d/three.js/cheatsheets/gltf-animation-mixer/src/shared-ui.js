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

export function bindRange(id, outputId, format, onChange, { immediate = true } = {}) {
  const input = readElement(id);

  function commit() {
    const value = Number(input.value);
    writeText(outputId, format(value));
    onChange(value);
  }

  input.addEventListener('input', commit);

  if (immediate) {
    commit();
  }

  return input;
}

export function bindCheckbox(id, onChange, { immediate = true } = {}) {
  const input = readElement(id);

  function commit() {
    onChange(input.checked);
  }

  input.addEventListener('change', commit);

  if (immediate) {
    commit();
  }

  return input;
}

export function bindButton(id, onClick) {
  const button = readElement(id);
  button.addEventListener('click', onClick);
  return button;
}

export function setButtonBusy(id, busy) {
  const button = readElement(id);
  button.disabled = busy;
}

export function setSelectOptions(id, options) {
  const select = readElement(id);
  select.replaceChildren(
    ...options.map((option) => {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      return element;
    })
  );
  return select;
}
