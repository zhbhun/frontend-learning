import { mountRapierLesson } from './rapier-loader.js';
import { createFixedStepLesson } from './scenes/fixed-step-scene.js';
import './styles.css';

mountRapierLesson(document.getElementById('scene-canvas'), createFixedStepLesson);
