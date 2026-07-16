import './styles.css';
import { createOrthographicScene } from './scenes/orthographic-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createOrthographicScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('height-output', snapshot.viewHeight.toFixed(1));
  writeText('zoom-output', snapshot.zoom.toFixed(2));
  writeText('distance-output', snapshot.distance.toFixed(1));
  writeText('box-readout', snapshot.boxText);
  writeText('zoom-readout', snapshot.zoom.toFixed(2));
  writeText('range-readout', `${snapshot.near.toFixed(1)} - ${snapshot.far.toFixed(1)}`);
  writeText('position-readout', snapshot.positionText);
  writeText('toolbar-readout', `zoom ${snapshot.zoom.toFixed(2)}`);
});

bindRange('height-input', 'height-output', (value) => value.toFixed(1), scene.setViewHeight);
bindRange('zoom-input', 'zoom-output', (value) => value.toFixed(2), scene.setZoom);
bindRange('distance-input', 'distance-output', (value) => value.toFixed(1), scene.setDistance);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
