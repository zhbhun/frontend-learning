/*
本示例演示什么：
用 MeshStandardNodeMaterial 和 TSL 节点表达式描述颜色、粗糙度和顶点位置。

读代码先看哪里：
先看 createNodeMaterial()。它没有写 GLSL 字符串，而是把 colorNode、roughnessNode、
positionNode 交给 NodeMaterial 系统生成后端需要的 shader。

页面控件对应哪些关键参数：
“旋转速度”只改变 JavaScript 里的 mesh 旋转，TSL 的 time 节点仍由 renderer 的节点帧系统驱动。

预期观察什么现象：
球体表面颜色会随时间流动，表面有轻微位移。若 WebGPURenderer 无法初始化，页面显示普通材质 fallback。
*/

import * as WebGLThree from 'three';
import { createBaseScene, createCamera, createGrid, disposeScene, getWebGPUBackendLabel, syncRendererAndCamera, startLoop } from '../shared-stage.js';
import { formatError, formatSize } from '../shared-ui.js';

export async function mountNodeMaterialLesson(canvas, { getRotationSpeed, onStatus, onMetric } = {}) {
  try {
    const THREE = await import('three/webgpu');
    const renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    onStatus?.('正在初始化 WebGPURenderer，用于运行 NodeMaterial...');
    await renderer.init();

    const { scene, camera, mesh } = await createNodeScene(THREE);
    const backendLabel = getWebGPUBackendLabel(THREE, renderer);

    onStatus?.('NodeMaterial 场景已运行。');
    onMetric?.('material', 'MeshStandardNodeMaterial');
    onMetric?.('inputs', 'colorNode、roughnessNode、positionNode');
    onMetric?.('backend', backendLabel);
    onMetric?.('fallback', backendLabel.includes('fallback') ? '当前由 WebGPURenderer 落到 WebGL2 后端' : '当前使用 WebGPU 后端');

    const stop = startLoop((time, delta) => {
      const size = syncRendererAndCamera(renderer, camera, canvas);
      const speed = getRotationSpeed?.() ?? 0.7;
      mesh.rotation.y += delta * speed;
      mesh.rotation.x = Math.sin(time * 0.7) * 0.16;
      renderer.render(scene, camera);
      onMetric?.('backend', `${backendLabel}；${formatSize(size)}`);
    });

    return () => {
      stop();
      disposeScene(scene);
      renderer.dispose();
    };
  } catch (error) {
    onStatus?.('NodeMaterial 场景无法初始化，显示普通 WebGL 材质 fallback。', 'warn');
    onMetric?.('fallback', formatError(error));
    return mountPlainMaterialFallback(canvas, { getRotationSpeed, onMetric });
  }
}

async function createNodeScene(THREE) {
  const { color, float, mix, positionLocal, sin, time, uv, vec3 } = await import('three/tsl');
  const scene = createBaseScene(THREE);
  const camera = createCamera(THREE, { position: [3.6, 2.4, 4.7] });
  const geometry = new THREE.SphereGeometry(1, 72, 36);
  const material = createNodeMaterial(THREE, { color, float, mix, positionLocal, sin, time, uv, vec3 });
  const mesh = new THREE.Mesh(geometry, material);

  scene.add(mesh, createGrid(THREE, { y: -1.15 }));
  return { scene, camera, mesh };
}

function createNodeMaterial(THREE, TSL) {
  const { color, float, mix, positionLocal, sin, time, uv, vec3 } = TSL;
  const material = new THREE.MeshStandardNodeMaterial({
    metalness: 0.18
  });

  // TSL 节点描述“材质输入来自哪里”，不是把 GLSL/WGSL 字符串塞给材质。
  const movingBand = sin(uv().y.mul(12).add(time.mul(0.9))).mul(0.5).add(0.5);
  const smallWave = sin(positionLocal.y.mul(10).add(time.mul(2))).mul(0.055);

  material.colorNode = mix(color('#2f83d8'), color('#f59e0b'), movingBand);
  material.roughnessNode = mix(float(0.18), float(0.86), uv().x);
  material.positionNode = positionLocal.add(vec3(0, smallWave, 0));

  return material;
}

function mountPlainMaterialFallback(canvas, { getRotationSpeed, onMetric }) {
  const renderer = new WebGLThree.WebGLRenderer({
    canvas,
    antialias: true
  });
  renderer.outputColorSpace = WebGLThree.SRGBColorSpace;

  const scene = createBaseScene(WebGLThree);
  const camera = createCamera(WebGLThree, { position: [3.6, 2.4, 4.7] });
  const geometry = new WebGLThree.SphereGeometry(1, 48, 24);
  const material = new WebGLThree.MeshStandardMaterial({
    color: '#8fa7c9',
    metalness: 0.1,
    roughness: 0.65
  });
  const mesh = new WebGLThree.Mesh(geometry, material);

  scene.add(mesh, createGrid(WebGLThree, { y: -1.15 }));
  onMetric?.('material', 'MeshStandardMaterial fallback');
  onMetric?.('inputs', '没有 NodeMaterial 节点输入');
  onMetric?.('backend', 'WebGLRenderer');

  const stop = startLoop((time, delta) => {
    syncRendererAndCamera(renderer, camera, canvas);
    mesh.rotation.y += delta * (getRotationSpeed?.() ?? 0.7);
    mesh.rotation.x = Math.sin(time * 0.7) * 0.16;
    renderer.render(scene, camera);
  });

  return () => {
    stop();
    disposeScene(scene);
    renderer.dispose();
  };
}
