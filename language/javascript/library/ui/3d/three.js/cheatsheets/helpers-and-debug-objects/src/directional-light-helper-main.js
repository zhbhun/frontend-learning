import './styles.css';
import { createDirectionalLightHelperScene } from './scenes/directional-light-helper-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createDirectionalLightHelperScene(
  document.querySelector('#scene-canvas'),
  (snapshot) => {
    writeText('light-x-output', snapshot.lightX.toFixed(1));
    writeText('target-x-output', snapshot.targetX.toFixed(1));
    writeText('light-position-readout', snapshot.lightPositionText);
    writeText('target-position-readout', snapshot.targetPositionText);
    writeText('direction-readout', snapshot.directionText);
    writeText('toolbar-readout', `light x ${snapshot.lightX.toFixed(1)}`);
  }
);

bindRange('light-x-input', 'light-x-output', (value) => value.toFixed(1), scene.setLightX);
bindRange('target-x-input', 'target-x-output', (value) => value.toFixed(1), scene.setTargetX);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
