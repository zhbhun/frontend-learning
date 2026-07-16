import { createLoadingErrorsLesson } from './scenes/loading-errors-scene.js';

const lesson = await createLoadingErrorsLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
