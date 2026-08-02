/*
纹理课范例共用的最小舞台。

输入是 canvas、scene、camera 和快照读取函数；resize 时同步 renderer，随后把真实
Texture 状态写入读数。范例本身没有持续动画，只在参数或尺寸变化时重绘。
*/

import * as THREE from 'three';

export function createTextureStage(canvas, scene, camera, readSnapshot) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    preserveDrawingBuffer: true
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#edf3ef', 1);

  let emitSnapshot = () => {};

  function render() {
    renderer.render(scene, camera);
    emitSnapshot(readSnapshot());
  }

  function resize() {
    const root = canvas.parentElement;
    const width = Math.max(1, Math.floor(root.clientWidth));
    const height = Math.max(1, Math.floor(root.clientHeight));

    renderer.setSize(width, height, false);

    if (camera.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    render();
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);
  resize();

  return {
    setSnapshotEmitter(nextEmitter) {
      emitSnapshot = nextEmitter;
    },
    render,
    dispose() {
      observer.disconnect();
      renderer.dispose();
    }
  };
}

export function createUvGrid(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext('2d');
  const cell = size / 4;

  context.fillStyle = '#f7f1df';
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      context.fillStyle = (x + y) % 2 === 0 ? '#2f6f61' : '#d99143';
      context.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  context.lineWidth = Math.max(2, size / 64);
  context.strokeStyle = '#152b25';
  context.strokeRect(1, 1, size - 2, size - 2);

  context.fillStyle = '#ffffff';
  context.font = `700 ${Math.round(size / 8)}px system-ui`;
  context.textBaseline = 'top';
  context.fillText('UV', size / 24, size / 32);

  context.fillStyle = '#b4382f';
  context.beginPath();
  context.moveTo(size * 0.84, size * 0.08);
  context.lineTo(size * 0.95, size * 0.16);
  context.lineTo(size * 0.84, size * 0.24);
  context.closePath();
  context.fill();

  return canvas;
}

