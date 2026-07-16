import './styles.css';
import { createHierarchyScene } from './hierarchy-scene.js';

const canvas = document.querySelector('#scene-canvas');
const runningButton = document.querySelector('[data-toggle-running]');
const resetButton = document.querySelector('[data-reset]');
const parentRotationInput = document.querySelector('[data-parent-rotation]');
const parentRotationValue = document.querySelector('[data-parent-rotation-value]');
const parentScaleInput = document.querySelector('[data-parent-scale]');
const parentScaleValue = document.querySelector('[data-parent-scale-value]');
const childXInput = document.querySelector('[data-child-x]');
const childXValue = document.querySelector('[data-child-x-value]');
const childYInput = document.querySelector('[data-child-y]');
const childYValue = document.querySelector('[data-child-y-value]');
const modeReadout = document.querySelector('[data-mode-readout]');

const metrics = {
  parentWorld: document.querySelector('[data-parent-world]'),
  childLocal: document.querySelector('[data-child-local]'),
  childWorld: document.querySelector('[data-child-world]')
};

function formatVector(vector) {
  return `${vector.x.toFixed(2)}, ${vector.y.toFixed(2)}, ${vector.z.toFixed(2)}`;
}

function updateControlReadouts(snapshot) {
  if (document.activeElement !== parentRotationInput) {
    parentRotationInput.value = String(snapshot.parentRotation);
  }

  parentRotationValue.textContent = `${snapshot.parentRotation.toFixed(0)}°`;
  parentScaleValue.textContent = snapshot.parentScale.toFixed(2);
  childXValue.textContent = snapshot.childLocal.x.toFixed(2);
  childYValue.textContent = snapshot.childLocal.y.toFixed(2);
  modeReadout.textContent = snapshot.running ? '自动旋转' : '暂停观察';

  metrics.parentWorld.textContent = formatVector(snapshot.parentWorld);
  metrics.childLocal.textContent = formatVector(snapshot.childLocal);
  metrics.childWorld.textContent = formatVector(snapshot.childWorld);
}

const hierarchyScene = createHierarchyScene(canvas, updateControlReadouts);

runningButton.addEventListener('click', () => {
  const running = hierarchyScene.toggleRunning();
  runningButton.textContent = running ? '暂停' : '继续';
});

resetButton.addEventListener('click', () => {
  hierarchyScene.reset();
  runningButton.textContent = '暂停';
  parentRotationInput.value = '25';
  parentScaleInput.value = '1';
  childXInput.value = '2.2';
  childYInput.value = '0.6';
});

parentRotationInput.addEventListener('input', () => {
  hierarchyScene.setParentRotation(Number(parentRotationInput.value));
  runningButton.textContent = '继续';
});

parentScaleInput.addEventListener('input', () => {
  hierarchyScene.setParentScale(Number(parentScaleInput.value));
});

childXInput.addEventListener('input', () => {
  hierarchyScene.setChildOffset({
    x: Number(childXInput.value),
    y: Number(childYInput.value)
  });
});

childYInput.addEventListener('input', () => {
  hierarchyScene.setChildOffset({
    x: Number(childXInput.value),
    y: Number(childYInput.value)
  });
});

window.addEventListener('beforeunload', () => {
  hierarchyScene.dispose();
});
