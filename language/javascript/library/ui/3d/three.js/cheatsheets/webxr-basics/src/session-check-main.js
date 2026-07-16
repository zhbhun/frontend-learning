import './styles.css';
import { createSessionCheckLesson } from './scenes/session-check-scene.js';
import { readElement } from './shared-ui.js';

createSessionCheckLesson(readElement('stage'));
