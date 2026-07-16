import { createLoopOwnershipController } from './scenes/loop-ownership-scene.js';
import { bindRange, setPressed, setText } from './shared-ui.js';

const modeButtons = Array.from(document.querySelectorAll('[data-mode]'));

const controller = createLoopOwnershipController({
  host: document.getElementById('loop-host'),
  onSnapshot(snapshot) {
    setText('loop-state', snapshot.running ? '运行中' : '已暂停');
    setText('loop-frames', snapshot.frames);
    setText('ui-renders', snapshot.uiRenders);
    setText('ui-state', `angle ${snapshot.uiState.angle} / tick ${snapshot.uiState.tick}`);
    setText('loop-owner', snapshot.loopOwner);
    setText('loop-action', snapshot.action);
  }
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    controller.setMode(button.dataset.mode);
    setPressed(modeButtons, button.dataset.mode, 'mode');
  });
});

document.getElementById('start-button').addEventListener('click', () => {
  controller.start();
});

document.getElementById('pause-button').addEventListener('click', () => {
  controller.pause();
});

document.getElementById('reset-loop-button').addEventListener('click', () => {
  controller.reset();
});

bindRange({
  inputId: 'loop-speed-input',
  outputId: 'loop-speed-output',
  format: (value) => value.toFixed(2),
  onInput: (value) => controller.setSpeed(value)
});

bindRange({
  inputId: 'ui-interval-input',
  outputId: 'ui-interval-output',
  format: (value) => `${value} ms`,
  onInput: (value) => controller.setUiInterval(value)
});

controller.start();
