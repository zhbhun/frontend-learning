import './styles.css';
import { createActionControlsLesson } from './scenes/action-controls-scene.js';

const lesson = await createActionControlsLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
