import './styles.css';
import { createAxesUnitsScene } from './scenes/axes-units-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createAxesUnitsScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('position-readout', snapshot.position);
  writeText('edge-readout', `${snapshot.edge.toFixed(1)} unit`);
  writeText('bottom-y-readout', snapshot.bottomY.toFixed(1));
  writeText('toolbar-readout', `position ${snapshot.position}`);
});

bindRange('x-input', 'x-output', (value) => value.toFixed(1), scene.setX);
bindRange('y-input', 'y-output', (value) => value.toFixed(1), scene.setY);
bindRange('z-input', 'z-output', (value) => value.toFixed(1), scene.setZ);
bindRange('size-input', 'size-output', (value) => value.toFixed(1), scene.setSize);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
