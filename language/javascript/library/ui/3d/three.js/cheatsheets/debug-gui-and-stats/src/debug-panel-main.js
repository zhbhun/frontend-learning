import './styles.css';
import { createDebugPanelScene } from './scenes/debug-panel-scene.js';
import { readElement, writeText } from './shared-ui.js';

const scene = createDebugPanelScene(
  readElement('scene-canvas'),
  readElement('gui-mount'),
  (snapshot) => {
    writeText('material-readout', snapshot.materialText);
    writeText('light-readout', snapshot.lightText);
    writeText('object-readout', snapshot.objectText);
    writeText('toolbar-readout', snapshot.toolbarText);
  }
);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
