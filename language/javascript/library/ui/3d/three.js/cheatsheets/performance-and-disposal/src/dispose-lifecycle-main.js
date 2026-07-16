import { createDisposeLifecycleScene, formatDisposeSnapshot } from './scenes/dispose-lifecycle-scene.js';
import { bindButton, bindCheckbox, readElement, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createDisposeLifecycleScene(readElement('scene-canvas'), (snapshot) => {
  const formatted = formatDisposeSnapshot(snapshot);
  writeText('active-readout', formatted.active);
  writeText('retained-readout', formatted.retained);
  writeText('geometries-readout', formatted.geometries);
  writeText('textures-readout', formatted.textures);
  writeText('programs-readout', formatted.programs);
  writeText('last-action-readout', formatted.lastAction);
});

bindCheckbox('safe-dispose', (checked) => lesson.setSafeDispose(checked));
bindButton('add-batch', () => lesson.addBatch());
bindButton('replace-textures', () => lesson.replaceTextures());
bindButton('remove-half', () => lesson.removeHalf());
bindButton('clear-scene', () => lesson.clearScene());
bindButton('release-retained', () => lesson.releaseRetained());

window.addEventListener('beforeunload', () => lesson.dispose());
