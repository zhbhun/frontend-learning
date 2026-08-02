/*
演示 CameraHelper 如何用第二台相机观察目标相机的视锥体，以及 helper.update() 的生效时机。

输入是被观察相机的 fov、far，以及是否每帧调用 helper.update()。
主要对象：
- watched：被观察的 PerspectiveCamera，加入 scene 以便 helper 跟踪它的世界矩阵。
- helper：CameraHelper(watched)，画出近裁剪面、远裁剪面和四条侧棱。
- renderCamera：实际渲染相机，从外部俯视整个布局。
预期结果：改 watched.fov 或 watched.far 并调用 updateProjectionMatrix() 后，只有 helper.update() 也被调用，
视锥线才会更新；关闭后视锥线停留在旧投影，读数则显示新的 fov / far。
读代码先看 watched 与 helper 的关系，再看 frame() 的 update 分支。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const cameraFrustumExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    // 渲染相机：从外部观察整个布局
    const renderCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
    renderCamera.position.set(8, 6.5, 10);
    renderCamera.lookAt(0, 1.4, 0);

    // 被观察的相机：加入 scene，CameraHelper 才能跟着它的矩阵
    const watched = new THREE.PerspectiveCamera(50, 1.6, 0.6, 7);
    watched.position.set(0, 1.6, 4.5);
    watched.lookAt(0, 0.8, 0);
    scene.add(watched);

    const helper = new THREE.CameraHelper(watched);
    scene.add(helper);

    // 标记 watched 的位置，方便和视锥顶端对应
    const watchedMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 16, 12),
      new THREE.MeshBasicMaterial({ color: '#9a3f32' })
    );
    watchedMarker.position.copy(watched.position);
    scene.add(watchedMarker);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));

    const subject = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 1.2, 1.2),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    subject.position.set(0, 0.6, 0);
    scene.add(subject);

    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.85));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(4, 7, 5);
    scene.add(key);

    const state = { callUpdate: true };

    function frame() {
      if (state.callUpdate) {
        helper.update();
      }
      renderer.render(scene, renderCamera);
      emitSnapshot({ watched, state });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      renderCamera.aspect = width / height;
      renderCamera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { watched, state, loop };
  },

  apply(instance, args) {
    const { watched, state, loop } = instance;
    watched.fov = args.fov;
    watched.far = args.far;
    watched.updateProjectionMatrix();
    state.callUpdate = args.callUpdate;
    loop.renderOnce();
  },

  readout({ watched, state }) {
    return [
      ['watched.fov', `${watched.fov.toFixed(0)}°`],
      ['watched.far', watched.far.toFixed(1)],
      ['watched.aspect', watched.aspect.toFixed(2)],
      ['helper.update()', state.callUpdate ? '每帧调用' : '已停止 → 视锥线过期']
    ];
  }
};
