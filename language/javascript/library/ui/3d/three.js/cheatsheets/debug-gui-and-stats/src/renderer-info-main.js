import './styles.css';
import { createRendererInfoScene } from './scenes/renderer-info-scene.js';
import { bindButtons, bindCheckbox, readElement, writeText } from './shared-ui.js';
import { formatNumber } from './shared-stage.js';

const scene = createRendererInfoScene(
  readElement('scene-canvas'),
  readElement('stats-mount'),
  (snapshot) => {
    writeText('objects-readout', formatNumber(snapshot.objectCount));
    writeText('calls-readout', formatNumber(snapshot.calls));
    writeText('triangles-readout', formatNumber(snapshot.triangles));
    writeText('textures-readout', formatNumber(snapshot.textures));
    writeText('programs-readout', formatNumber(snapshot.programs));
    writeText('toolbar-readout', snapshot.toolbarText);
  }
);

bindButtons(
  [
    { id: 'count-1-button', value: 1 },
    { id: 'count-24-button', value: 24 },
    { id: 'count-96-button', value: 96 }
  ],
  scene.setObjectCount
);
bindCheckbox('texture-input', scene.setUseTexture);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
