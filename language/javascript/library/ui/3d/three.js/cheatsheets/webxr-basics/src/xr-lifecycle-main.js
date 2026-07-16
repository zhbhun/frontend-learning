import './styles.css';
import { createXrLifecycleLesson } from './scenes/xr-lifecycle-scene.js';
import { readElement } from './shared-ui.js';

createXrLifecycleLesson(readElement('stage'));
