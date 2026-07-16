import { createSceneNodesLesson } from './scenes/scene-nodes-scene.js';

const lesson = await createSceneNodesLesson(document.getElementById('scene-canvas'));

window.addEventListener('beforeunload', () => {
  lesson.dispose();
});
