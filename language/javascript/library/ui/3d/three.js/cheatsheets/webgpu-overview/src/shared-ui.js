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

export function writeStatus(id, value, tone = 'ok') {
  const element = readElement(id);
  element.textContent = value;
  element.classList.toggle('warn', tone === 'warn');
  element.classList.toggle('fail', tone === 'fail');
}

export function bindButton(id, onClick) {
  const button = readElement(id);
  button.addEventListener('click', onClick);
  return button;
}

export function bindCheckbox(id, onChange, { immediate = true } = {}) {
  const checkbox = readElement(id);

  function commit() {
    onChange(checkbox.checked);
  }

  checkbox.addEventListener('change', commit);

  if (immediate) {
    commit();
  }

  return checkbox;
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

export function clearMetrics(id) {
  readElement(id).replaceChildren();
}

export function addMetric(id, label, value, tone = 'ok') {
  const row = document.createElement('div');
  const term = document.createElement('dt');
  const detail = document.createElement('dd');

  row.className = tone;
  term.textContent = label;
  detail.textContent = value;
  row.append(term, detail);
  readElement(id).append(row);
}

export function formatError(error) {
  if (!error) {
    return '未知错误';
  }

  return error.message || String(error);
}

export function formatSize(size) {
  return `${size.width} x ${size.height} CSS；${size.drawingWidth} x ${size.drawingHeight} buffer；PR ${formatNumber(size.pixelRatio)}`;
}

export function formatNumber(value, digits = 2) {
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}
