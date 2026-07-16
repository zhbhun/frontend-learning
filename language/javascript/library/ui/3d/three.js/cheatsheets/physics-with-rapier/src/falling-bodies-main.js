import { mountRapierLesson } from './rapier-loader.js';
import { createFallingBodiesLesson } from './scenes/falling-bodies-scene.js';
import './styles.css';

mountRapierLesson(document.getElementById('scene-canvas'), createFallingBodiesLesson);
