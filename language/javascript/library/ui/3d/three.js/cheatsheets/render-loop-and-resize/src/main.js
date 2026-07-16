import './styles.css';
import { createResponsiveScene } from './responsive-scene.js';

const canvas = document.querySelector('#scene-canvas');
const stageFrame = document.querySelector('[data-stage-frame]');
const strategyReadout = document.querySelector('[data-strategy-readout]');
const strategyInputs = [...document.querySelectorAll('input[name="strategy"]')];
const stageWidthInput = document.querySelector('[data-stage-width]');
const stageWidthValue = document.querySelector('[data-stage-width-value]');
const pixelRatioInput = document.querySelector('[data-pixel-ratio]');
const pixelRatioValue = document.querySelector('[data-pixel-ratio-value]');
const speedInput = document.querySelector('[data-speed]');
const speedValue = document.querySelector('[data-speed-value]');

const metrics = {
  cssSize: document.querySelector('[data-css-size]'),
  bufferSize: document.querySelector('[data-buffer-size]'),
  aspect: document.querySelector('[data-aspect]'),
  delta: document.querySelector('[data-delta]'),
  fps: document.querySelector('[data-fps]')
};

const strategyLabels = {
  correct: '正确同步',
  'css-only': '只拉伸 CSS',
  'wrong-camera': '忘记相机比例'
};

const scene = createResponsiveScene(canvas, (snapshot) => {
  metrics.cssSize.textContent = `${snapshot.cssWidth} x ${snapshot.cssHeight}`;
  metrics.bufferSize.textContent = `${snapshot.bufferWidth} x ${snapshot.bufferHeight}`;
  metrics.aspect.textContent = snapshot.aspect.toFixed(3);
  metrics.delta.textContent = `${(snapshot.delta * 1000).toFixed(1)} ms`;
  metrics.fps.textContent = snapshot.fps.toFixed(0);
  strategyReadout.textContent = strategyLabels[snapshot.strategy];
});

strategyInputs.forEach((input) => {
  input.addEventListener('change', () => {
    if (!input.checked) return;
    scene.setResizeMode(input.value);
  });
});

stageWidthInput.addEventListener('input', () => {
  const width = Number(stageWidthInput.value);
  stageFrame.style.setProperty('--stage-width', `${width}%`);
  stageWidthValue.textContent = `${width}%`;
});

pixelRatioInput.addEventListener('input', () => {
  const value = Number(pixelRatioInput.value);
  scene.setPixelRatio(value);
  pixelRatioValue.textContent = value.toFixed(2);
});

speedInput.addEventListener('input', () => {
  const speed = Number(speedInput.value);
  scene.setSpeed(speed);
  speedValue.textContent = `${speed.toFixed(1)}x`;
});

window.addEventListener('beforeunload', () => {
  scene.dispose();
});
