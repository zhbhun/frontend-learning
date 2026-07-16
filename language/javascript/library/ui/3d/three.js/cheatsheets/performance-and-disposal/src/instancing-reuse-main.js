import { createInstancingReuseScene, formatInstancingSnapshot } from './scenes/instancing-reuse-scene.js';
import { formatNumber } from './shared-stage.js';
import { bindCheckbox, bindRange, bindSelect, readElement, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createInstancingReuseScene(readElement('scene-canvas'), (snapshot) => {
  const formatted = formatInstancingSnapshot(snapshot);
  writeText('objects-readout', formatted.objects);
  writeText('calls-readout', formatted.calls);
  writeText('triangles-readout', formatted.triangles);
  writeText('geometries-readout', formatted.geometries);
  writeText('textures-readout', formatted.textures);
  writeText('programs-readout', formatted.programs);
});

bindSelect('render-mode', (value) => lesson.setMode(value));
bindRange('instance-count', 'instance-count-value', formatNumber, (value) => lesson.setCount(value));
bindCheckbox('use-instance-colors', (checked) => lesson.setUseColors(checked));

window.addEventListener('beforeunload', () => lesson.dispose());
