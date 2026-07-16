import './styles.css';
import { createVrButtonLoopLesson } from './scenes/vr-button-loop-scene.js';
import { readElement } from './shared-ui.js';

createVrButtonLoopLesson(readElement('stage'));
