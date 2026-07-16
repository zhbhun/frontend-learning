import { createViewerShellLesson } from './scenes/viewer-shell-scene.js';

const canvas = document.getElementById('scene-canvas');

createViewerShellLesson(canvas).catch((error) => {
  console.error(error);
});
