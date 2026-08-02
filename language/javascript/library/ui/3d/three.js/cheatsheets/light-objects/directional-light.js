/*
演示 DirectionalLight 的方向由 light.target 决定，以及 target 必须加入场景树
才能被 renderer 更新世界矩阵这一隐蔽生效步骤。

输入是 target 在 XZ 平面上的位置，以及"target 是否在场景树中"开关。
主要对象：
- light：DirectionalLight，平行光方向 = light.position → light.target 的世界位置。
- light.target：独立的 Object3D，默认 parent 为 null，必须 scene.add 才会被 renderer 更新。
预期结果：把 target 移出场景树后，改 target.position 不再影响画面中的光照方向，
读数里的"target 世界位置"也停留在上一次 renderer 写入的旧值。
读代码先看 create() 中 light 与 light.target 的关系，再看 frame() 中 target 的挂载切换。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

// 直接从 matrixWorld 读取，避免触发 updateWorldMatrix 把过期值刷新掉
const lightWorldPos = new THREE.Vector3();
const targetWorldPos = new THREE.Vector3();
const direction = new THREE.Vector3();

export const directionalLightExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6.5, 5, 8.5);
    camera.lookAt(0, 1.2, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.9 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(16, 16, '#5a6168', '#42484f'));

    // 受光雕塑：MeshStandardMaterial 才会响应 DirectionalLight
    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.22, 120, 18),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.35, metalness: 0.15 })
    );
    statue.position.set(0, 1.3, 0);
    scene.add(statue);

    // 平行光：方向由 position 到 target 的世界坐标之差决定
    const light = new THREE.DirectionalLight('#fff3d6', 3.0);
    light.position.set(3.2, 5, 3.2);
    light.target.position.set(0, 1.3, 0);
    scene.add(light);
    scene.add(light.target); // 关键：target 必须进入场景树，renderer 才会更新它的 matrixWorld

    // 弱半球光避免背光面完全死黑，便于看出平行光方向的变化
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.25));

    const helper = new THREE.DirectionalLightHelper(light, 1.6, '#ffd070');
    scene.add(helper);

    const state = { targetInScene: true };

    function frame(delta) {
      statue.rotation.y += delta * 0.3;

      // 按开关把 target 挂进或移出场景树
      if (state.targetInScene && !light.target.parent) {
        scene.add(light.target);
      } else if (!state.targetInScene && light.target.parent) {
        light.target.removeFromParent();
      }

      helper.update();
      // renderer.render 会更新在场景树中的对象；不在树中的 target 不会被刷新
      renderer.render(scene, camera);

      light.getWorldPosition(lightWorldPos);
      // 直接读取 target.matrixWorld，不触发更新，保留过期值的观察
      targetWorldPos.setFromMatrixPosition(light.target.matrixWorld);
      direction.subVectors(lightWorldPos, targetWorldPos).normalize();
      emitSnapshot({ light, state, targetWorldPos, direction });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { light, state, loop };
  },

  apply(instance, args) {
    const { light, state, loop } = instance;
    light.target.position.set(args.targetX, 1.3, args.targetZ);
    state.targetInScene = args.targetInScene;
    loop.renderOnce();
  },

  readout({ light, state, targetWorldPos, direction }) {
    return [
      ['light.target.position（局部）', formatVector(light.target.position)],
      ['target.matrixWorld 平移', formatVector(targetWorldPos)],
      ['光照方向（世界，归一）', formatVector(direction)],
      ['target 是否在场景树', state.targetInScene ? '是 → 局部位置生效' : '否 → 停在旧值']
    ];
  }
};
