import './styles.css';
import { createBackgroundFogScene } from './scenes/background-fog-scene.js';
import { bindCheckbox, bindColor, bindRange, writeText } from './shared-ui.js';

const scene = createBackgroundFogScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('background-readout', snapshot.background);
  writeText('fog-readout', String(snapshot.fog));
  writeText('near-readout', snapshot.near.toFixed(1));
  writeText('far-readout', snapshot.far.toFixed(1));
  writeText(
    'toolbar-readout',
    snapshot.fog ? `Fog ${snapshot.near.toFixed(1)} - ${snapshot.far.toFixed(1)}` : 'Fog off'
  );
});

bindColor('background-input', 'background-output', scene.setBackground);
bindCheckbox('fog-input', scene.setFog);
bindRange('near-input', 'near-output', (value) => value.toFixed(1), scene.setNear);
bindRange('far-input', 'far-output', (value) => value.toFixed(1), scene.setFar);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
