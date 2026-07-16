import './styles.css';
import { createOrbitControlsScene } from './scenes/orbit-controls-scene.js';
import { bindCheckbox, bindRange, writeText } from './shared-ui.js';

const scene = createOrbitControlsScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('min-distance-output', snapshot.minDistance.toFixed(1));
  writeText('max-distance-output', snapshot.maxDistance.toFixed(1));
  writeText('target-y-output', snapshot.targetY.toFixed(2));
  writeText('target-readout', snapshot.targetText);
  writeText('distance-readout', snapshot.distance.toFixed(2));
  writeText('damping-readout', String(snapshot.damping));
  writeText('auto-readout', String(snapshot.autoRotate));
  writeText('toolbar-readout', `target ${snapshot.targetText}`);
});

bindCheckbox('damping-input', scene.setDamping);
bindCheckbox('auto-rotate-input', scene.setAutoRotate);
bindCheckbox('pan-input', scene.setPan);
bindRange(
  'min-distance-input',
  'min-distance-output',
  (value) => value.toFixed(1),
  scene.setMinDistance
);
bindRange(
  'max-distance-input',
  'max-distance-output',
  (value) => value.toFixed(1),
  scene.setMaxDistance
);
bindRange('target-y-input', 'target-y-output', (value) => value.toFixed(2), scene.setTargetY);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
