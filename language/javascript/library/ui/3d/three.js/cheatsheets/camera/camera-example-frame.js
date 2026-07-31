/*
三个相机实例共用的观察舞台。

输入是具体相机及其快照读取函数；主要操作是按画布尺寸更新相机、渲染场景，
再用当前 view-projection matrix 计算哪些物体处在视锥体内。画面、可见物体
读数和矩阵读数因此来自同一次真实渲染状态。
*/

import * as THREE from 'three';

import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  readCanvasSize,
  rotateObjects
} from '../../assets/shared-scene.js';

const OBJECT_LABELS = ['立方体', '球体', '圆锥', '圆环'];

export function createCameraExampleFrame({
  canvas,
  camera,
  emitSnapshot,
  onResize,
  readSnapshot
}) {
  const renderer = createRenderer(canvas);
  const { scene, objects } = createCameraTargetScene();
  const viewProjection = new THREE.Matrix4();
  const frustum = new THREE.Frustum();

  function readVisibleObjects() {
    scene.updateMatrixWorld(true);
    camera.updateWorldMatrix(true, false);
    viewProjection.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(
      viewProjection,
      camera.coordinateSystem,
      camera.reversedDepth
    );

    return objects
      .map((object, index) =>
        frustum.intersectsObject(object) ? OBJECT_LABELS[index] : null
      )
      .filter(Boolean);
  }

  function draw(delta) {
    rotateObjects(objects, delta);
    renderer.render(scene, camera);

    emitSnapshot({
      ...readSnapshot(),
      visibleObjects: readVisibleObjects()
    });
  }

  const loop = createRenderLoop(canvas, draw);

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    onResize(width / height);
    loop.renderOnce();
  }

  const resizeObserver = createResizeObserver(canvas, resize);
  resize();

  return {
    render() {
      loop.renderOnce();
    },
    dispose() {
      loop.dispose();
      resizeObserver.disconnect();
      renderer.dispose();
    }
  };
}
