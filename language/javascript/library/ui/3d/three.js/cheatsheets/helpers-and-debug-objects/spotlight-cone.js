/*
演示 SpotLightHelper 的锥体可视化，以及 helper.update() 的生效时机。

输入是聚光灯的角度（度）、半影 penumbra，以及是否每帧调用 helper.update()。
主要对象：
- spot：被辅助的 SpotLight，照亮场景中央的雕塑。
- helper：SpotLightHelper(spot)，画出锥体和到目标的连线。
预期结果：改 spot.angle 或 spot.penumbra 后，只有 helper.update() 被调用，锥体线才会更新；
关闭后锥体停留在旧角度，而画面中实际照亮的范围已经随 spot.angle 改变。
读代码先看 spot 与 helper 的关系，再看 frame() 的 update 分支。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const spotlightConeExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#2a2d33');

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

    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.22, 120, 18),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.35, metalness: 0.15 })
    );
    statue.position.set(0, 1.3, 0);
    scene.add(statue);

    const spot = new THREE.SpotLight('#fff3d6', 150, 10, Math.PI / 6, 0.3, 2);
    spot.position.set(3, 5.5, 3.5);
    spot.target.position.set(0, 1.3, 0);
    scene.add(spot);
    scene.add(spot.target);

    const helper = new THREE.SpotLightHelper(spot, '#ffd070');
    scene.add(helper);

    // 弱环境光避免 Helper 之外的完全死黑，不影响锥体可读性
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.3));

    const state = { callUpdate: true };

    function frame(delta) {
      statue.rotation.y += delta * 0.4;
      if (state.callUpdate) {
        helper.update();
      }
      renderer.render(scene, camera);
      emitSnapshot({ spot, state });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { spot, state, loop };
  },

  apply(instance, args) {
    const { spot, state, loop } = instance;
    spot.angle = THREE.MathUtils.degToRad(args.angleDeg);
    spot.penumbra = args.penumbra;
    state.callUpdate = args.callUpdate;
    loop.renderOnce();
  },

  readout({ spot, state }) {
    return [
      ['spot.angle', `${THREE.MathUtils.radToDeg(spot.angle).toFixed(0)}°`],
      ['spot.penumbra', spot.penumbra.toFixed(2)],
      ['spot.distance', spot.distance.toFixed(1)],
      ['helper.update()', state.callUpdate ? '每帧调用' : '已停止 → 锥体过期']
    ];
  }
};
