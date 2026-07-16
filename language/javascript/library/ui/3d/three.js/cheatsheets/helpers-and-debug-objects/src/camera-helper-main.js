import './styles.css';
import { createCameraHelperScene } from './scenes/camera-helper-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createCameraHelperScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('fov-output', `${snapshot.fov.toFixed(0)}°`);
  writeText('near-output', snapshot.near.toFixed(1));
  writeText('far-output', snapshot.far.toFixed(1));
  writeText('range-readout', snapshot.rangeText);
  writeText('update-readout', snapshot.updateText);
  writeText('toolbar-readout', `fov ${snapshot.fov.toFixed(0)}°`);
});

bindRange('fov-input', 'fov-output', (value) => `${value.toFixed(0)}°`, scene.setFov);
bindRange('near-input', 'near-output', (value) => value.toFixed(1), scene.setNear);
bindRange('far-input', 'far-output', (value) => value.toFixed(1), scene.setFar);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
