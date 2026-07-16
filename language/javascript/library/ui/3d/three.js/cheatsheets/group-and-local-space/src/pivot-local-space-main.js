import './styles.css';
import { createPivotLocalSpaceScene } from './scenes/pivot-local-space-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createPivotLocalSpaceScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('angle-output', `${snapshot.angle.toFixed(0)}°`);
  writeText('offset-output', snapshot.offset.toFixed(1));
  writeText('pivot-x-output', snapshot.pivotX.toFixed(1));
  writeText('panel-local-x-readout', snapshot.panelLocalX.toFixed(1));
  writeText('panel-world-x-readout', snapshot.panelWorldX.toFixed(2));
  writeText('panel-world-z-readout', snapshot.panelWorldZ.toFixed(2));
  writeText('pivot-world-x-readout', snapshot.pivotWorldX.toFixed(1));
  writeText('toolbar-readout', `angle ${snapshot.angle.toFixed(0)}°`);
});

bindRange('angle-input', 'angle-output', (value) => `${value}°`, scene.setAngle);
bindRange('offset-input', 'offset-output', (value) => value.toFixed(1), scene.setOffset);
bindRange('pivot-x-input', 'pivot-x-output', (value) => value.toFixed(1), scene.setPivotX);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
