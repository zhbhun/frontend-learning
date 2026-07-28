/*
本示例把视锥体本身画出来。同一个 renderer 用 scissor 分成两个视图：
左边是被观察相机（subject）自己渲染的画面，右边是一台固定的外部相机（observer）看同一个场景，
并通过 CameraHelper 显示 subject 的视锥体线框。

读代码先看 rebuildSubject()：切换 type 时要整台相机重建，CameraHelper 也要跟着换绑定对象。
再看 render()：setScissorTest + setViewport 让一个画布出两个视图，helper 只在右视图可见。

预期观察：透视相机的视锥体是一个截头四棱锥，正交相机是一个长方体盒子；
调 near / far 时能同时看到线框被切短，以及左视图里对应的物体消失。
*/

import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  readCanvasSize,
  rotateObjects,
  target
} from '../../../../assets/shared-scene.js';

const SUBJECT_POSITION = new THREE.Vector3(8, 4.7, 8);

const initialState = {
  type: 'perspective',
  fov: 45,
  viewHeight: 5.5,
  near: 4,
  far: 20
};

export function createFrustumScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  // 外部相机固定在垂直于视锥体轴线的方向上，这样锥体的张开角度看得最清楚。
  const observer = new THREE.PerspectiveCamera(45, 1, 0.5, 300);
  observer.position.set(26, 15, -14);
  observer.lookAt(1.5, 0.5, 1.5);

  let subjectAspect = 1;
  let subject = null;
  let helper = null;

  function rebuildSubject() {
    if (helper) {
      world.scene.remove(helper);
      helper.dispose();
    }

    if (state.type === 'perspective') {
      subject = new THREE.PerspectiveCamera(state.fov, subjectAspect, state.near, state.far);
    } else {
      const halfHeight = state.viewHeight / 2;
      const halfWidth = halfHeight * subjectAspect;
      subject = new THREE.OrthographicCamera(
        -halfWidth,
        halfWidth,
        halfHeight,
        -halfHeight,
        state.near,
        state.far
      );
    }

    subject.position.copy(SUBJECT_POSITION);
    subject.lookAt(target);
    subject.updateProjectionMatrix();

    helper = new THREE.CameraHelper(subject);
    world.scene.add(helper);
  }

  function applyProjection() {
    if (state.type === 'perspective') {
      subject.fov = state.fov;
      subject.aspect = subjectAspect;
    } else {
      const halfHeight = state.viewHeight / 2;
      const halfWidth = halfHeight * subjectAspect;
      subject.left = -halfWidth;
      subject.right = halfWidth;
      subject.top = halfHeight;
      subject.bottom = -halfHeight;
    }

    subject.near = state.near;
    subject.far = Math.max(state.far, state.near + 0.5);
    subject.updateProjectionMatrix();
    helper.update();
  }

  function publishSnapshot() {
    onSnapshot?.({
      type: state.type === 'perspective' ? '截头四棱锥' : '长方体盒子',
      depthRange: `${subject.near.toFixed(1)} – ${subject.far.toFixed(1)}`
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);

    const half = Math.max(1, Math.floor(width / 2));
    subjectAspect = half / height;
    observer.aspect = (width - half) / height;
    observer.updateProjectionMatrix();

    applyProjection();
    publishSnapshot();
  }

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);

    const { width, height } = readCanvasSize(canvas);
    const half = Math.max(1, Math.floor(width / 2));

    // scissor 让两次 render 各自只清除并绘制自己那一半画布。
    renderer.setScissorTest(true);

    helper.visible = false;
    renderer.setViewport(0, 0, half, height);
    renderer.setScissor(0, 0, half, height);
    renderer.render(world.scene, subject);

    helper.visible = true;
    renderer.setViewport(half, 0, width - half, height);
    renderer.setScissor(half, 0, width - half, height);
    renderer.render(world.scene, observer);

    publishSnapshot();
  });

  rebuildSubject();
  resize();
  loop.renderOnce();

  const resizeObserver = createResizeObserver(canvas, resize);

  return {
    setType(type) {
      if (type === state.type) {
        return;
      }

      state.type = type;
      rebuildSubject();
      applyProjection();
      publishSnapshot();
    },
    setFov(fov) {
      state.fov = fov;
      applyProjection();
      publishSnapshot();
    },
    setViewHeight(viewHeight) {
      state.viewHeight = viewHeight;
      applyProjection();
      publishSnapshot();
    },
    setNear(near) {
      state.near = near;
      applyProjection();
      publishSnapshot();
    },
    setFar(far) {
      state.far = far;
      applyProjection();
      publishSnapshot();
    },
    dispose() {
      loop.dispose();
      resizeObserver.disconnect();

      if (helper) {
        world.scene.remove(helper);
        helper.dispose();
      }

      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
