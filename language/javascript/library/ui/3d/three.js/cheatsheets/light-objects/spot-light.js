/*
演示 SpotLight 的 angle 与 penumbra 怎样改变锥形照射范围与软边。

输入是 angle（度）、penumbra 和 distance。angle 控制锥体的半角，penumbra 在 [0,1] 上
控制软边占比。主要对象：
- light：SpotLight，方向由 light.position 指向 light.target。
- helper：SpotLightHelper，画出锥体侧面与到 target 的连线。
预期结果：angle 越大锥体越宽；penumbra 越大边缘越柔。读代码先看 spot 与 target 的挂载，
再看 readout 的派生读数。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const spotLightExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1f2429');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6.5, 5, 8.5);
    camera.lookAt(0, 1.2, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(16, 16, '#5a6168', '#42484f'));

    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.22, 120, 18),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.4 })
    );
    statue.position.set(0, 1.3, 0);
    scene.add(statue);

    // SpotLight：intensity 单位为 candela（cd），direction 由 target 决定
    const light = new THREE.SpotLight('#fff3d6', 80, 12, Math.PI / 6, 0.3, 2);
    light.position.set(3.2, 5.2, 3.2);
    light.target.position.set(0, 1.3, 0);
    scene.add(light);
    scene.add(light.target);

    // 弱环境光避免锥外完全死黑，便于看出锥形边界
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.18));

    const helper = new THREE.SpotLightHelper(light, '#ffd070');
    scene.add(helper);

    function frame(delta) {
      statue.rotation.y += delta * 0.3;
      helper.update();
      renderer.render(scene, camera);
      emitSnapshot({ light });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { light, loop, helper };
  },

  apply(instance, args) {
    const { light, helper, loop } = instance;
    light.angle = THREE.MathUtils.degToRad(args.angleDeg);
    light.penumbra = args.penumbra;
    light.distance = args.distance;
    helper.update();
    loop.renderOnce();
  },

  readout({ light }) {
    return [
      ['spot.angle', `${THREE.MathUtils.radToDeg(light.angle).toFixed(0)}°`],
      ['spot.penumbra', light.penumbra.toFixed(2)],
      ['spot.distance', light.distance.toFixed(1)],
      ['light.position', formatVector(light.position)]
    ];
  }
};
