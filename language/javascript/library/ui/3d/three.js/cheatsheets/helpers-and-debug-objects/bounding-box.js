/*
演示 BoxHelper 与 Box3Helper 的差异，以及 helper.update() 的生效时机。

输入是 target 的旋转角度、缩放，以及是否每帧调用 boxHelper.update()。
主要对象：
- BoxHelper(target) 跟踪 Group 的世界 AABB（含全部子级），需要 update() 才能跟上变换。
- Box3Helper(referenceBox) 显示一个手动构造的固定 Box3，不随 target 变化。
预期结果：关闭 update 后，红色 BoxHelper 停在上一次的盒子上；绿色 Box3Helper 始终不变。
读数中的"真实世界 AABB"由 Box3.setFromObject() 独立计算，可与画面中的红盒对照。
读代码先看 create() 中两个 helper 的构造，再看 frame() 中的 update 分支。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

const realBox = new THREE.Box3();
const min = new THREE.Vector3();
const max = new THREE.Vector3();

export const boundingBoxExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6.5, 5, 8.5);
    camera.lookAt(0, 1.1, 0);

    // 被辅助的对象：Group 含主立方体和偏移球体，旋转 / 缩放时世界 AABB 会变化
    const target = new THREE.Group();
    target.position.set(0, 1.1, 0);
    scene.add(target);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 1.6, 1.6),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    target.add(box);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 28, 18),
      new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.5 })
    );
    sphere.position.set(1.3, 0.2, 0);
    target.add(sphere);

    // BoxHelper 跟踪 target（含子级）的世界 AABB，需要 update() 才能跟上
    const boxHelper = new THREE.BoxHelper(target, '#9a3f32');
    scene.add(boxHelper);

    // Box3Helper 显示手动设置的固定参考盒，没有 update() 方法
    const referenceBox = new THREE.Box3(
      new THREE.Vector3(-2.2, 0, -1.6),
      new THREE.Vector3(2.2, 3.2, 1.6)
    );
    const box3Helper = new THREE.Box3Helper(referenceBox, '#2f8b72');
    scene.add(box3Helper);

    scene.add(new THREE.GridHelper(14, 14, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));

    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.85));
    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 7, 5);
    scene.add(key);

    const state = { callUpdate: true };

    function frame() {
      if (state.callUpdate) {
        // BoxHelper 不会自动跟踪，应用必须主动调用
        boxHelper.update();
      }
      renderer.render(scene, camera);

      // 独立计算真实世界 AABB 供读数对照，与 BoxHelper 内部的 setFromObject 一致
      realBox.setFromObject(target);
      realBox.getMin(min);
      realBox.getMax(max);
      emitSnapshot({ target, state, min, max });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { target, state, loop };
  },

  apply(instance, args) {
    const { target, state, loop } = instance;
    target.rotation.y = THREE.MathUtils.degToRad(args.rotationY);
    target.scale.setScalar(args.scale);
    state.callUpdate = args.callUpdate;
    loop.renderOnce();
  },

  readout({ target, state, min, max }) {
    return [
      ['target.rotation.y', `${THREE.MathUtils.radToDeg(target.rotation.y).toFixed(0)}°`],
      ['target.scale', target.scale.x.toFixed(2)],
      ['真实世界 AABB min', formatVector(min)],
      ['真实世界 AABB max', formatVector(max)],
      ['boxHelper.update()', state.callUpdate ? '每帧调用' : '已停止 → 红盒过期']
    ];
  }
};
