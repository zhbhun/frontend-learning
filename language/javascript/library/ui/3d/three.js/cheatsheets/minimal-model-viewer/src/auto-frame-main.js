import { createAutoFrameLesson } from './scenes/auto-frame-scene.js';

const canvas = document.getElementById('scene-canvas');

createAutoFrameLesson(canvas).catch((error) => {
  console.error(error);
});
