import { mountRapierLesson } from './rapier-loader.js';
import { createContactEventsLesson } from './scenes/contact-events-scene.js';
import './styles.css';

mountRapierLesson(document.getElementById('scene-canvas'), createContactEventsLesson);
