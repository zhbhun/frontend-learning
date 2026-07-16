import { createOnDemandRenderScene, formatOnDemandSnapshot } from './scenes/on-demand-render-scene.js';
import { formatNumber } from './shared-stage.js';
import { bindButton, bindCheckbox, bindRange, readElement, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createOnDemandRenderScene(readElement('scene-canvas'), (snapshot) => {
  const formatted = formatOnDemandSnapshot(snapshot);
  writeText('frames-readout', formatted.frames);
  writeText('mode-readout', formatted.mode);
  writeText('visibility-readout', formatted.visibility);
  writeText('intersection-readout', formatted.intersection);
  writeText('calls-readout', formatted.calls);
  writeText('reason-readout', formatted.reason);
});

bindCheckbox('continuous-render', (checked) => lesson.setContinuous(checked));
bindRange('rotation', 'rotation-value', formatNumber, (value) => lesson.setRotation(value));
bindButton('request-frame', () => lesson.requestFrame());

window.addEventListener('beforeunload', () => lesson.dispose());
