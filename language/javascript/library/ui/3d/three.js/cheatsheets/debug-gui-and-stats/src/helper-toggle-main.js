import './styles.css';
import { createHelperToggleScene } from './scenes/helper-toggle-scene.js';
import { bindCheckbox, bindRange, writeText } from './shared-ui.js';

const scene = createHelperToggleScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('helper-readout', `${snapshot.visibleCount} 个可见`);
  writeText('update-readout', snapshot.updateText);
  writeText('toolbar-readout', snapshot.toolbarText);
});

bindCheckbox('axes-input', scene.setAxes);
bindCheckbox('grid-input', scene.setGrid);
bindCheckbox('box-input', scene.setBox);
bindCheckbox('camera-input', scene.setCamera);
bindCheckbox('light-input', scene.setLight);
bindCheckbox('update-input', scene.setAutoUpdate);
bindRange('rotation-input', 'rotation-output', (value) => `${value.toFixed(0)}°`, scene.setRotationY);
bindRange('far-input', 'far-output', (value) => value.toFixed(1), scene.setCameraFar);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
