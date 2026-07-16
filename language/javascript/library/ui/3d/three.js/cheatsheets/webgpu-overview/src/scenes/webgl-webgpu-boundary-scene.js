/*
本示例演示什么：
把相似的场景分别交给 WebGLRenderer 和 WebGPURenderer，观察共同接口和初始化边界。

读代码先看哪里：
先看 mountBoundaryLesson()。WebGLRenderer 同步创建；WebGPURenderer 需要 await init()，
并且可以通过 forceWebGL 选项强制走 WebGL2 后端。

页面控件对应哪些状态：
“WebGPURenderer 强制 WebGL2 后端”只改变 WebGPURenderer 的后端，不把右侧改成 WebGLRenderer。

预期观察什么现象：
两侧都能 render(scene, camera)，但右侧状态会显示 WebGPURenderer 当前选择的后端。
*/

import * as WebGLThree from 'three';
import { createBaseScene, createCamera, createGrid, disposeScene, getWebGPUBackendLabel, syncRendererAndCamera, startLoop } from '../shared-stage.js';
import { formatError, formatSize } from '../shared-ui.js';

export async function mountBoundaryLesson({ webglCanvas, webgpuCanvas, forceWebGLBackend = false, onMetric } = {}) {
  const cleanups = [];

  cleanups.push(mountClassicWebGL(webglCanvas, onMetric));
  cleanups.push(await mountCommonRenderer(webgpuCanvas, { forceWebGLBackend, onMetric }));

  onMetric?.('shared', 'setSize、setPixelRatio、render(scene, camera)、dispose 等接口相似');
  onMetric?.('boundary', '初始化时机、后端能力、NodeMaterial、后处理链和 shader 写法不能直接假设相同');

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
}

function mountClassicWebGL(canvas, onMetric) {
  const renderer = new WebGLThree.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.outputColorSpace = WebGLThree.SRGBColorSpace;

  const { scene, camera, mesh } = createBoundaryScene(WebGLThree, '#6a9bd8');
  onMetric?.('webgl', '同步创建；WebGLRenderer 直接使用 WebGL 上下文');

  const stop = startLoop((time, delta) => {
    const size = syncRendererAndCamera(renderer, camera, canvas);
    mesh.rotation.y += delta * 0.65;
    mesh.rotation.z = Math.sin(time) * 0.18;
    renderer.render(scene, camera);
    onMetric?.('webgl', `WebGLRenderer；${formatSize(size)}`);
  });

  return () => {
    stop();
    disposeScene(scene);
    renderer.dispose();
  };
}

async function mountCommonRenderer(canvas, { forceWebGLBackend, onMetric }) {
  try {
    const THREE = await import('three/webgpu');
    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      forceWebGL: forceWebGLBackend
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    await renderer.init();

    const { scene, camera, mesh } = createBoundaryScene(THREE, '#68b88e');
    const backendLabel = getWebGPUBackendLabel(THREE, renderer);
    onMetric?.('webgpu', `已初始化；${backendLabel}`);

    const stop = startLoop((time, delta) => {
      const size = syncRendererAndCamera(renderer, camera, canvas);
      mesh.rotation.y += delta * 0.65;
      mesh.rotation.z = Math.sin(time) * 0.18;
      renderer.render(scene, camera);
      onMetric?.('webgpu', `WebGPURenderer；${backendLabel}；${formatSize(size)}`);
    });

    return () => {
      stop();
      disposeScene(scene);
      renderer.dispose();
    };
  } catch (error) {
    onMetric?.('webgpu', `WebGPURenderer 初始化失败：${formatError(error)}`);
    return () => {};
  }
}

function createBoundaryScene(THREE, color) {
  const scene = createBaseScene(THREE, { background: '#111827' });
  const camera = createCamera(THREE, { position: [3.2, 2.1, 4.2] });
  const geometry = new THREE.BoxGeometry(1.25, 1.25, 1.25, 3, 3, 3);
  const material = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.12,
    roughness: 0.5
  });
  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh, createGrid(THREE));
  return { scene, camera, mesh };
}
