export function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = String(value);
  }
}

export function setPressed(buttons, activeValue, attributeName) {
  buttons.forEach((button) => {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset[attributeName] === activeValue)
    );
  });
}

export function bindRange({ inputId, outputId, format, onInput }) {
  const input = document.getElementById(inputId);
  const output = document.getElementById(outputId);

  function publish() {
    const value = Number(input.value);
    if (output) {
      output.textContent = format ? format(value) : String(value);
    }
    onInput?.(value);
  }

  input.addEventListener('input', publish);
  publish();
  return input;
}

export function formatDisposed(disposed) {
  return `geometry ${disposed.geometries} / material ${disposed.materials} / texture ${disposed.textures}`;
}

export function formatRendererInfo(info) {
  return `calls ${info.calls} / triangles ${info.triangles} / geometry ${info.geometries} / texture ${info.textures}`;
}
