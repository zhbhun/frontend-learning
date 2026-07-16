import { mountRapierLesson } from './rapier-loader.js';
import { createColliderShapesLesson } from './scenes/collider-shapes-scene.js';
import './styles.css';

mountRapierLesson(document.getElementById('scene-canvas'), createColliderShapesLesson);
