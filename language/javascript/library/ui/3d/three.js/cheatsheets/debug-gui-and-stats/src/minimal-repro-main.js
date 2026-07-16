import './styles.css';
import { createMinimalReproScene } from './scenes/minimal-repro-scene.js';
import { bindRadioGroup, readElement, writeText } from './shared-ui.js';

const scene = createMinimalReproScene(readElement('scene-canvas'), (snapshot) => {
  writeText('mode-readout', snapshot.modeText);
  writeText('nodes-readout', snapshot.nodesText);
  writeText('box-readout', snapshot.boxText);
  writeText('diagnosis-readout', snapshot.diagnosisText);
  writeText('toolbar-readout', snapshot.toolbarText);
});

bindRadioGroup('repro-mode', scene.setMode);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
