import './styles.css';
import { createMeshPartsScene } from './scenes/mesh-parts-scene.js';
import { bindCheckbox, bindRange, writeText } from './shared-ui.js';

const scene = createMeshPartsScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('rotation-output', `${snapshot.rotation.toFixed(0)}°`);
  writeText('scale-output', snapshot.scale.toFixed(2));
  writeText('geometry-readout', snapshot.geometry);
  writeText('material-readout', snapshot.material);
  writeText('vertex-readout', String(snapshot.vertices));
  writeText('size-readout', snapshot.sizeText);
  writeText('toolbar-readout', snapshot.wireframe ? 'wireframe' : `${snapshot.geometry} + ${snapshot.material}`);
});

bindCheckbox('wireframe-input', scene.setWireframe);
bindCheckbox('normal-input', scene.setNormal);
bindCheckbox('box-input', scene.setShowBox);
bindRange('rotation-input', 'rotation-output', (value) => `${value.toFixed(0)}°`, scene.setRotation);
bindRange('scale-input', 'scale-output', (value) => value.toFixed(2), scene.setScale);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
