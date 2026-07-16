import './styles.css';
import { createControllerInputLesson } from './scenes/controller-input-scene.js';
import { readElement } from './shared-ui.js';

createControllerInputLesson(readElement('stage'));
