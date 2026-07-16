import './styles.css';
import { createClipPlaybackLesson } from './scenes/clip-playback-scene.js';

const lesson = await createClipPlaybackLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
