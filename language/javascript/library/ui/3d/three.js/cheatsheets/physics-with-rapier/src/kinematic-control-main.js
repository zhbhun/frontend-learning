import { mountRapierLesson } from './rapier-loader.js';
import { createKinematicControlLesson } from './scenes/kinematic-control-scene.js';
import './styles.css';

mountRapierLesson(document.getElementById('scene-canvas'), createKinematicControlLesson);
