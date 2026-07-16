import {
  bindRange,
  bindSelect,
  formatNumber,
  formatSize,
  readElement,
  writeText
} from './shared-ui.js';
import { createResponsiveContainerScene } from './scenes/responsive-container-scene.js';

const lesson = createResponsiveContainerScene({
  canvas: readElement('scene-canvas'),
  container: readElement('responsive-frame'),
  onSnapshot: updateSnapshot
});

bindRange('container-width', 'container-width-value', (value) => `${value}%`, lesson.setContainerWidth);
bindRange('pixel-ratio', 'pixel-ratio-value', (value) => formatNumber(value, 2), lesson.setPixelRatioLimit);
bindSelect('aspect-ratio', lesson.setAspectRatio);

window.addEventListener('beforeunload', lesson.dispose);

function updateSnapshot(snapshot) {
  writeText('css-size', formatSize(snapshot.width, snapshot.height));
  writeText('buffer-size', formatSize(snapshot.bufferWidth, snapshot.bufferHeight));
  writeText('camera-aspect', formatNumber(snapshot.aspect, 3));
  writeText('dpr-state', `${formatNumber(snapshot.pixelRatio, 2)} / device ${formatNumber(snapshot.deviceRatio, 2)}`);
  writeText('resize-reason', snapshot.reason);
}
