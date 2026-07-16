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

export function bindCheckbox(id, onChange) {
  const input = readElement(id);

  function commit() {
    onChange(input.checked);
  }

  input.addEventListener('change', commit);
  commit();
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

export function bindButtons(entries, onChange) {
  function commit(activeEntry) {
    entries.forEach(({ id }) => readElement(id).classList.toggle('is-active', id === activeEntry.id));
    onChange(activeEntry.value);
  }

  entries.forEach((entry) => {
    readElement(entry.id).addEventListener('click', () => commit(entry));
  });

  commit(entries[0]);
}

export function bindRadioGroup(name, onChange) {
  const inputs = Array.from(document.querySelectorAll(`input[name="${name}"]`));

  if (inputs.length === 0) {
    throw new Error(`找不到单选组：${name}`);
  }

  function commit() {
    const checked = inputs.find((input) => input.checked);
    onChange(checked.value);
  }

  inputs.forEach((input) => input.addEventListener('change', commit));
  commit();
}
