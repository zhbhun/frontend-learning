import './styles.css';
import { createSceneRootScene } from './scenes/scene-root-scene.js';
import { bindCheckbox, writeText } from './shared-ui.js';

const scene = createSceneRootScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('children-readout', String(snapshot.children));
  writeText('mesh-readout', String(snapshot.meshes));
  writeText('light-readout', String(snapshot.lights));
  writeText('traverse-readout', String(snapshot.traversed));
  writeText('toolbar-readout', `scene.children ${snapshot.children}`);
});

bindCheckbox('cube-input', scene.setCube);
bindCheckbox('sphere-input', scene.setSphere);
bindCheckbox('helper-input', scene.setHelper);
bindCheckbox('light-input', scene.setLight);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
