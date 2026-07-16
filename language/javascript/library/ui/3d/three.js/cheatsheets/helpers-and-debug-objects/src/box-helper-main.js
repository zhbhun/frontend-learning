import './styles.css';
import { createBoxHelperScene } from './scenes/box-helper-scene.js';
import { bindCheckbox, bindRange, writeText } from './shared-ui.js';

const scene = createBoxHelperScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('rotation-output', `${snapshot.rotationY.toFixed(0)}°`);
  writeText('scale-output', snapshot.scale.toFixed(2));
  writeText('box-size-readout', snapshot.sizeText);
  writeText('helper-readout', snapshot.helperText);
  writeText('alignment-readout', '世界轴对齐');
  writeText('toolbar-readout', snapshot.updateHelper ? 'updated' : 'stale');
});

bindCheckbox('update-helper-input', scene.setUpdateHelper);
bindRange('rotation-input', 'rotation-output', (value) => `${value.toFixed(0)}°`, scene.setRotationY);
bindRange('scale-input', 'scale-output', (value) => value.toFixed(2), scene.setScale);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
