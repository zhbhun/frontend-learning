import { createGltfLoaderLesson } from './scenes/gltf-loader-scene.js';

const lesson = await createGltfLoaderLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
