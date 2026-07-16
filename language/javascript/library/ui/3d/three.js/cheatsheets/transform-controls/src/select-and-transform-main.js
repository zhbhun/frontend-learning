import { createSelectAndTransformLesson } from './scenes/select-and-transform-scene.js';
import { bindButton, bindSelect, writeText } from './shared-ui.js';
import './styles.css';

const lesson = createSelectAndTransformLesson(document.getElementById('scene-canvas'), (snapshot) => {
  writeText('selected-state', snapshot.selected);
  writeText('drag-state', snapshot.dragging ? '是' : '否');
  writeText('position-state', snapshot.position);
  writeText('rotation-state', snapshot.rotation);
  writeText('scale-state', snapshot.scale);
  writeText('action-state', snapshot.action);
});

bindSelect('mode-control', (mode) => lesson.setMode(mode));
bindButton('clear-selection', () => lesson.clearSelection());

window.addEventListener('beforeunload', () => lesson.dispose());
