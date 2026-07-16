import { createRerenderBoundaryController } from './scenes/rerender-boundary-scene.js';
import { formatRendererInfo, setPressed, setText } from './shared-ui.js';

const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));
const versionInput = document.getElementById('version-input');
const versionOutput = document.getElementById('version-output');

const controller = createRerenderBoundaryController({
  host: document.getElementById('rerender-host'),
  onSnapshot(snapshot) {
    setText('mode-label', snapshot.mode === 'stable' ? '稳定引用' : '重复创建');
    setText('framework-renders', snapshot.renders);
    setText('created-resources', `geometry ${snapshot.created.geometries} / material ${snapshot.created.materials}`);
    setText('rerender-disposals', `geometry ${snapshot.disposed.geometries} / material ${snapshot.disposed.materials}`);
    setText('active-resources', formatRendererInfo(snapshot.info));
    setText('rerender-action', snapshot.action);
    versionInput.value = String(snapshot.version);
    versionOutput.textContent = String(snapshot.version);
  }
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    controller.setMode(button.dataset.mode);
    setPressed(modeButtons, button.dataset.mode, 'mode');
  });
});

document.getElementById('render-once-button').addEventListener('click', () => {
  controller.renderNext();
});

document.getElementById('render-many-button').addEventListener('click', () => {
  controller.renderMany(20);
});

document.getElementById('reset-button').addEventListener('click', () => {
  controller.reset();
});

versionInput.addEventListener('input', () => {
  controller.renderVersion(Number(versionInput.value));
});

controller.renderVersion(0);
