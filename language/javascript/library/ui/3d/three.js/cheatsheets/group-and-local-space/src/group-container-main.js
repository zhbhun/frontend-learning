import './styles.css';
import { createGroupContainerScene } from './scenes/group-container-scene.js';
import { bindCheckbox, bindRange, writeText } from './shared-ui.js';

const scene = createGroupContainerScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('group-x-output', snapshot.groupX.toFixed(1));
  writeText('rotation-output', `${snapshot.rotationY.toFixed(0)}°`);
  writeText('scale-output', snapshot.scale.toFixed(2));
  writeText('children-readout', String(snapshot.children));
  writeText('traverse-readout', String(snapshot.traversed));
  writeText('world-x-readout', snapshot.worldX.toFixed(1));
  writeText('body-local-x-readout', snapshot.bodyLocalX.toFixed(1));
  writeText('toolbar-readout', `children ${snapshot.children}`);
});

bindRange('group-x-input', 'group-x-output', (value) => value.toFixed(1), scene.setGroupX);
bindRange('rotation-input', 'rotation-output', (value) => `${value}°`, scene.setRotationY);
bindRange('scale-input', 'scale-output', (value) => value.toFixed(2), scene.setScale);
bindCheckbox('axes-input', scene.setAxes);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
