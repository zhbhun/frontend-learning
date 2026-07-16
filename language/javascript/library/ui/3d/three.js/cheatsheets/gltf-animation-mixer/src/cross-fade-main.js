import './styles.css';
import { createCrossFadeLesson } from './scenes/cross-fade-scene.js';

const lesson = await createCrossFadeLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
