import { formatNumber, readElement, writeText } from './shared-ui.js';
import { createVisibilityPauseScene } from './scenes/visibility-pause-scene.js';

const lesson = createVisibilityPauseScene({
  canvas: readElement('scene-canvas'),
  frame: readElement('visibility-frame'),
  onSnapshot: updateSnapshot
});

window.addEventListener('beforeunload', lesson.dispose);

function updateSnapshot(snapshot) {
  writeText('loop-state', snapshot.running ? '渲染中' : '已暂停');
  writeText('visibility-state', snapshot.visible ? 'visible' : 'hidden');
  writeText('intersection-state', snapshot.inViewport ? 'in view' : 'out of view');
  writeText('frame-count', snapshot.frames);
  writeText('delta-state', `${formatNumber(snapshot.deltaMs, 1)} ms`);
  writeText('pause-reason', snapshot.reason);
}
