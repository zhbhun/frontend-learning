import './styles.css';
import { createAxesHelperScene } from './scenes/axes-helper-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createAxesHelperScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('helper-size-output', snapshot.helperSize.toFixed(1));
  writeText('rotation-output', `${snapshot.rotationY.toFixed(0)}°`);
  writeText('size-readout', snapshot.helperSize.toFixed(1));
  writeText('mount-readout', snapshot.mountText);
  writeText('toolbar-readout', `size ${snapshot.helperSize.toFixed(1)}`);
});

bindRange('helper-size-input', 'helper-size-output', (value) => value.toFixed(1), scene.setHelperSize);
bindRange('rotation-input', 'rotation-output', (value) => `${value.toFixed(0)}°`, scene.setRotationY);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
