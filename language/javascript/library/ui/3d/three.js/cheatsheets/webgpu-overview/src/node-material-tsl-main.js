import { bindRange, writeStatus, writeText } from './shared-ui.js';
import { mountNodeMaterialLesson } from './scenes/node-material-tsl-scene.js';

let rotationSpeed = 0.7;

bindRange('rotation-speed', (value) => {
  rotationSpeed = value;
});

const cleanup = await mountNodeMaterialLesson(document.getElementById('scene-canvas'), {
  getRotationSpeed: () => rotationSpeed,
  onStatus: (text, tone) => writeStatus('node-state', text, tone),
  onMetric: writeMetric
});

window.addEventListener('pagehide', cleanup, { once: true });

function writeMetric(name, value) {
  const targets = {
    material: 'material-state',
    inputs: 'node-input-state',
    backend: 'backend-state',
    fallback: 'fallback-state'
  };

  writeText(targets[name], value);
}
