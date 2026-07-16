import { createLoadingStateLesson } from './scenes/loading-state-scene.js';

const canvas = document.getElementById('scene-canvas');

createLoadingStateLesson(canvas).catch((error) => {
  console.error(error);
});
