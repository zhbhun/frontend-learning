import './styles.css';
import { createGridHelperScene } from './scenes/grid-helper-scene.js';
import { bindRange, writeText } from './shared-ui.js';

const scene = createGridHelperScene(document.querySelector('#scene-canvas'), (snapshot) => {
  writeText('grid-size-output', snapshot.gridSize.toFixed(0));
  writeText('divisions-output', snapshot.divisions.toFixed(0));
  writeText('size-readout', snapshot.gridSize.toFixed(0));
  writeText('divisions-readout', snapshot.divisions.toFixed(0));
  writeText('cell-readout', snapshot.cellSize.toFixed(2));
  writeText('range-readout', snapshot.rangeText);
  writeText('toolbar-readout', `cell ${snapshot.cellSize.toFixed(2)}`);
});

bindRange('grid-size-input', 'grid-size-output', (value) => value.toFixed(0), scene.setGridSize);
bindRange('divisions-input', 'divisions-output', (value) => value.toFixed(0), scene.setDivisions);

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
