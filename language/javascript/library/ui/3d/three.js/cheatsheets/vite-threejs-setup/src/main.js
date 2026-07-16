import * as THREE from 'three';
import './styles.css';

const checks = document.querySelector('#checks');
const revision = document.querySelector('[data-three-revision]');
const sizeLabel = document.querySelector('[data-renderer-size]');
const stage = document.querySelector('#renderer-stage');

revision.textContent = THREE.REVISION;

function addCheck(label, detail, ok = true) {
  const item = document.createElement('li');
  item.className = ok ? 'check check-ok' : 'check check-fail';
  item.innerHTML = `
    <span class="check-dot" aria-hidden="true"></span>
    <span>
      <strong>${label}</strong>
      <small>${detail}</small>
    </span>
  `;
  checks.append(item);
}

addCheck('模块导入', "成功导入 import * as THREE from 'three'");
addCheck('three 包', `当前运行 THREE.REVISION ${THREE.REVISION}`);

let renderer;

try {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    // 本课保留绘制缓冲区，方便自动读取像素验证。
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#14213d', 1);
  renderer.domElement.className = 'renderer-canvas';
  stage.append(renderer.domElement);

  addCheck('WebGLRenderer', '渲染器和 canvas 创建成功');
} catch (error) {
  addCheck('WebGLRenderer', error.message, false);
}

function resizeRenderer() {
  if (!renderer) return;

  const { width, height } = stage.getBoundingClientRect();
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));

  renderer.setSize(safeWidth, safeHeight, false);
  sizeLabel.textContent = `${safeWidth} x ${safeHeight}`;
  renderer.clear();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();
