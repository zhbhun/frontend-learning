import { createTransformControlsLesson } from './scenes/transform-controls-scene.js';
import {
  bindButton,
  bindCheckbox,
  bindRange,
  bindSelect,
  readElement,
  writeText
} from './shared-ui.js';
import './styles.css';

const lesson = createTransformControlsLesson(document.getElementById('scene-canvas'), (snapshot) => {
  const spaceControl = readElement('space-control');
  spaceControl.disabled = snapshot.spaceLocked;
  spaceControl.value = snapshot.effectiveSpace;

  writeText(
    'mode-state',
    `${snapshot.mode} / ${snapshot.effectiveSpace}${snapshot.spaceLocked ? '（固定）' : ''}`
  );
  writeText('drag-state', snapshot.dragging ? '是' : '否');
  writeText('position-state', snapshot.position);
  writeText('rotation-state', snapshot.rotation);
  writeText('scale-state', snapshot.scale);
  readElement('attachment-control').textContent = snapshot.attached ? 'detach' : 'attach';
});

bindSelect('mode-control', (mode) => lesson.setMode(mode));
bindSelect('space-control', (space) => lesson.setSpace(space));
bindCheckbox('snap-control', (enabled) => lesson.setSnapEnabled(enabled));
bindRange('translation-snap-control', 'translation-snap-output', (value) => value.toFixed(2), (value) => {
  lesson.setTranslationSnap(value);
});
bindRange('rotation-snap-control', 'rotation-snap-output', (value) => `${value}°`, (value) => {
  lesson.setRotationSnap(value);
});
bindRange('scale-snap-control', 'scale-snap-output', (value) => value.toFixed(2), (value) => {
  lesson.setScaleSnap(value);
});
bindRange('size-control', 'size-output', (value) => value.toFixed(2), (value) => {
  lesson.setSize(value);
});
bindCheckbox('show-x-control', (visible) => lesson.setAxisVisible('x', visible));
bindCheckbox('show-y-control', (visible) => lesson.setAxisVisible('y', visible));
bindCheckbox('show-z-control', (visible) => lesson.setAxisVisible('z', visible));
bindButton('attachment-control', () => lesson.toggleAttachment());
bindButton('reset-object', () => lesson.resetObject());

window.addEventListener('beforeunload', () => lesson.dispose());
