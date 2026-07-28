/*
本示例回答“为什么改完 fov 要调用 updateProjectionMatrix()”。

autoUpdate 关闭时，setFov 只写 camera.fov，不重算矩阵。读数会出现两个值：
camera.fov 是字段里的新值，生效 fov 是从 projectionMatrix 反解出来的、渲染真正用的值。
两者一旦不一致，画面就停在旧的投影上——这正是“改了没反应”的全过程。

读代码先看 setFov() 和 effectiveFov()。resize() 里的还原动作是为了让演示准确：
画布尺寸变化必须更新 aspect，但不能顺手把还没提交的 fov 一起生效。
*/

import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../../../../assets/shared-scene.js';

const initialState = {
  fov: 55,
  autoUpdate: true,
  appliedFov: 55
};

export function createUpdateProjectionScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  const camera = new THREE.PerspectiveCamera(state.fov, 1, 0.1, 60);
  placeCamera(camera, 12);

  // projectionMatrix 的 [1][1] 项等于 1 / tan(fov / 2)，反解它就能拿到渲染实际使用的 fov。
  function effectiveFov() {
    const scaleY = camera.projectionMatrix.elements[5];
    return THREE.MathUtils.radToDeg(2 * Math.atan(1 / scaleY));
  }

  function commit() {
    camera.updateProjectionMatrix();
    state.appliedFov = camera.fov;
  }

  function publishSnapshot() {
    const applied = effectiveFov();

    onSnapshot?.({
      fov: camera.fov.toFixed(0),
      appliedFov: applied.toFixed(1),
      stale: Math.abs(applied - camera.fov) > 0.5
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);

    // 先把 fov 换回已生效的值，更新 aspect 之后再放回来，
    // 这样 resize 不会替用户提交那个还挂着的 fov 改动。
    const pending = camera.fov;
    camera.fov = state.appliedFov;
    camera.aspect = width / height;
    commit();
    camera.fov = pending;

    publishSnapshot();
  }

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  resize();
  loop.renderOnce();

  const observer = createResizeObserver(canvas, resize);

  return {
    setFov(fov) {
      state.fov = fov;
      camera.fov = fov;

      if (state.autoUpdate) {
        commit();
      }

      publishSnapshot();
    },
    setAutoUpdate(autoUpdate) {
      state.autoUpdate = autoUpdate;

      if (autoUpdate) {
        commit();
      }

      publishSnapshot();
    },
    dispose() {
      loop.dispose();
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
