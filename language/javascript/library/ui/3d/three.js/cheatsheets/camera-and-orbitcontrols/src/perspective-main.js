import './styles.css';
import { createPerspectiveScene } from './scenes/perspective-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createPerspectiveScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('fov-output', `${snapshot.fov.toFixed(0)}°`);
  writeText('near-output', snapshot.near.toFixed(1));
  writeText('far-output', snapshot.far.toFixed(1));
  writeText('distance-output', snapshot.distance.toFixed(1));
  writeText('fov-readout', `${snapshot.fov.toFixed(0)}°`);
  writeText('aspect-readout', snapshot.aspect.toFixed(3));
  writeText('range-readout', `${snapshot.near.toFixed(1)} - ${snapshot.far.toFixed(1)}`);
  writeText('position-readout', snapshot.positionText);
  writeText('toolbar-readout', `fov ${snapshot.fov.toFixed(0)}°`);
});

bindRange('fov-input', 'fov-output', (value) => `${value.toFixed(0)}°`, scene.setFov);
bindRange('near-input', 'near-output', (value) => value.toFixed(1), scene.setNear);
bindRange('far-input', 'far-output', (value) => value.toFixed(1), scene.setFar);
bindRange('distance-input', 'distance-output', (value) => value.toFixed(1), scene.setDistance);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
