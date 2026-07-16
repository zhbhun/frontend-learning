import { createTextureBudgetScene, formatTextureBudgetSnapshot } from './scenes/texture-budget-scene.js';
import { bindCheckbox, bindSelect, readElement, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createTextureBudgetScene(readElement('scene-canvas'), (snapshot) => {
  const formatted = formatTextureBudgetSnapshot(snapshot);
  writeText('textures-readout', formatted.textures);
  writeText('estimated-readout', formatted.estimated);
  writeText('filter-readout', formatted.filter);
  writeText('version-readout', formatted.version);
  writeText('calls-readout', formatted.calls);
  writeText('programs-readout', formatted.programs);
});

bindSelect('texture-source', (value) => lesson.setSource(value));
bindSelect('texture-size', (value) => lesson.setSize(value));
bindSelect('texture-count', (value) => lesson.setTextureCount(value));
bindCheckbox('reuse-texture', (checked) => lesson.setReuseTexture(checked));
bindCheckbox('generate-mipmaps', (checked) => lesson.setGenerateMipmaps(checked));
bindSelect('min-filter', (value) => lesson.setMinFilter(value));

window.addEventListener('beforeunload', () => lesson.dispose());
