import { createRenderCostScene, formatRenderCostSnapshot } from './scenes/render-cost-scene.js';
import { formatNumber } from './shared-stage.js';
import { bindRange, bindSelect, readElement, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createRenderCostScene(readElement('scene-canvas'), (snapshot) => {
  const formatted = formatRenderCostSnapshot(snapshot);
  writeText('calls-readout', formatted.calls);
  writeText('triangles-readout', formatted.triangles);
  writeText('points-readout', formatted.points);
  writeText('lines-readout', formatted.lines);
  writeText('materials-readout', formatted.materials);
  writeText('programs-readout', formatted.programs);
});

bindRange('object-count', 'object-count-value', formatNumber, (value) => lesson.setObjectCount(value));
bindSelect('primitive-kind', (value) => lesson.setPrimitiveKind(value));
bindRange('segment-count', 'segment-count-value', formatNumber, (value) => lesson.setSegmentCount(value));
bindSelect('material-mode', (value) => lesson.setMaterialMode(value));

window.addEventListener('beforeunload', () => lesson.dispose());
