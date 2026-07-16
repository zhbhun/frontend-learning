import { createImperativeAdapter } from './scenes/imperative-adapter-scene.js';
import { bindRange, formatDisposed, setText } from './shared-ui.js';

const host = document.getElementById('adapter-host');
const colorSelect = document.getElementById('color-select');
const wireframeInput = document.getElementById('wireframe-input');

const adapter = createImperativeAdapter({
  host,
  onSnapshot(snapshot) {
    setText('adapter-state', snapshot.mounted ? '已挂载' : '未挂载');
    setText('prop-updates', snapshot.propUpdates);
    setText('frame-count', snapshot.frames);
    setText('canvas-size', snapshot.size ? `${snapshot.size.width} x ${snapshot.size.height}` : '0 x 0');
    setText('disposed-resources', formatDisposed(snapshot.disposed));
    setText('adapter-action', snapshot.action);
  }
});

function readProps() {
  return {
    color: colorSelect.value,
    speed: Number(document.getElementById('speed-input').value),
    wireframe: wireframeInput.checked
  };
}

document.getElementById('mount-button').addEventListener('click', () => {
  adapter.mount(readProps());
});

document.getElementById('update-button').addEventListener('click', () => {
  adapter.update(readProps());
});

document.getElementById('unmount-button').addEventListener('click', () => {
  adapter.unmount();
});

colorSelect.addEventListener('input', () => {
  adapter.update(readProps());
});

wireframeInput.addEventListener('change', () => {
  adapter.update(readProps());
});

bindRange({
  inputId: 'speed-input',
  outputId: 'speed-output',
  format: (value) => value.toFixed(2),
  onInput: () => adapter.update(readProps())
});

adapter.mount(readProps());
