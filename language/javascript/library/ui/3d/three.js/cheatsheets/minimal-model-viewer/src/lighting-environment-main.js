import { createLightingEnvironmentLesson } from './scenes/lighting-environment-scene.js';

const canvas = document.getElementById('scene-canvas');

createLightingEnvironmentLesson(canvas).catch((error) => {
  console.error(error);
});
