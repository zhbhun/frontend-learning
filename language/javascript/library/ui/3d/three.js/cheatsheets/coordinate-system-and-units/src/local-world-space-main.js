import './styles.css';
import { createLocalWorldSpaceScene } from './scenes/local-world-space-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createLocalWorldSpaceScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('radians-readout', snapshot.radians.toFixed(3));
  writeText('child-local-readout', snapshot.childLocal);
  writeText('child-world-readout', snapshot.childWorld);
  writeText('toolbar-readout', `parent ${snapshot.angle}°`);
});

bindRange('angle-input', 'angle-output', (value) => `${value}°`, scene.setAngle);
bindRange('parent-x-input', 'parent-x-output', (value) => value.toFixed(1), scene.setParentX);
bindRange('child-x-input', 'child-x-output', (value) => value.toFixed(1), scene.setChildX);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
