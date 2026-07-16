import './styles.css';
import { createFirstScene } from './scene.js';

const canvas = document.querySelector('#scene-canvas');
const frameReadout = document.querySelector('[data-frame-readout]');
const modeButtons = [...document.querySelectorAll('[data-mode]')];
const toggleRunning = document.querySelector('[data-toggle-running]');
const resetButton = document.querySelector('[data-reset]');
const speedInput = document.querySelector('[data-speed]');
const speedValue = document.querySelector('[data-speed-value]');
const cameraInput = document.querySelector('[data-camera-distance]');
const cameraValue = document.querySelector('[data-camera-value]');

let running = true;

const firstScene = createFirstScene(canvas, ({ frame }) => {
  frameReadout.textContent = `第 ${frame} 帧`;
});

modeButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const wireframe = button.dataset.mode === 'wireframe';
    firstScene.setWireframe(wireframe);

    modeButtons.forEach((item) => {
      item.classList.toggle('is-active', item === button);
    });
  });
});

toggleRunning.addEventListener('click', () => {
  running = !running;
  firstScene.setRunning(running);
  toggleRunning.textContent = running ? '暂停动画' : '继续动画';
});

resetButton.addEventListener('click', () => {
  firstScene.reset();
});

speedInput.addEventListener('input', () => {
  const speed = Number(speedInput.value);
  speedValue.textContent = `${speed.toFixed(1)}x`;
  firstScene.setSpeed(speed);
});

cameraInput.addEventListener('input', () => {
  const distance = Number(cameraInput.value);
  cameraValue.textContent = distance.toFixed(1);
  firstScene.setCameraDistance(distance);
});

window.addEventListener('beforeunload', () => {
  firstScene.dispose();
});
