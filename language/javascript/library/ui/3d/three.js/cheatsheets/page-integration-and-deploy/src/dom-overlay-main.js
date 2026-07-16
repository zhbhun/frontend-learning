import { bindCheckbox, formatNumber, readElement, writeText } from './shared-ui.js';
import { createDomOverlayScene } from './scenes/dom-overlay-scene.js';

const lesson = createDomOverlayScene({
  canvas: readElement('scene-canvas'),
  blocker: readElement('overlay-blocker'),
  onSnapshot: updateSnapshot
});

bindCheckbox('overlay-blocking', lesson.setOverlayBlocking);
window.addEventListener('beforeunload', lesson.dispose);

function updateSnapshot(snapshot) {
  writeText('pointer-source', snapshot.source);
  writeText('ndc-state', `x ${formatNumber(snapshot.ndcX, 2)}, y ${formatNumber(snapshot.ndcY, 2)}`);
  writeText('hover-state', snapshot.hover);
  writeText('selected-state', snapshot.selected);
  writeText('overlay-state', snapshot.overlayMode);
}
