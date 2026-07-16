import './styles.css';
import { createReplacePartsScene } from './scenes/replace-parts-scene.js';
import { bindCheckbox, bindRange, bindSelect, writeText } from './shared-ui.js';

const scene = createReplacePartsScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('geometry-readout', snapshot.geometry);
  writeText('material-readout', snapshot.material);
  writeText('vertex-readout', String(snapshot.vertices));
  writeText('opacity-readout', snapshot.opacity.toFixed(2));
  writeText('opacity-output', snapshot.opacity.toFixed(2));
  writeText('toolbar-readout', `${snapshot.geometry} / ${snapshot.material}`);
});

bindSelect('geometry-input', scene.setGeometry);
bindSelect('material-input', scene.setMaterial);
bindRange('opacity-input', 'opacity-output', (value) => value.toFixed(2), scene.setOpacity);
bindCheckbox('animate-input', scene.setAnimate);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
