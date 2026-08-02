/*
演示 PointLight 的 distance / decay 怎样改变全向光的衰减。

输入是 intensity、distance 与 decay。distance=0 表示不设距离上限，按 decay 的反比规律
衰减到无穷远；distance>0 时会在该距离处平滑收尾到 0。
主要对象：
- light：PointLight，挂在雕塑上方，向四周均匀发光。
- helper：PointLightHelper，画出光源位置和 distance 影响下的示意范围。
预期结果：把 decay 从 2 调到 0，地面远端的亮度明显抬起；distance 从 0 调到较小值，
远端会被截掉。读代码先看 create() 中 light 与 helper 的关系，再看 readout 的派生读数。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  formatVector,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const pointLightExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1d22');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6, 4.5, 8);
    camera.lookAt(0, 1, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(18, 18, '#566167', '#3b4047'));

    // 受光物体：雕塑 + 几个排列在远处的球，便于观察距离衰减
    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.6, 0.22, 120, 18),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.4 })
    );
    statue.position.set(0, 1.2, 0);
    scene.add(statue);

    const orbGeometry = new THREE.SphereGeometry(0.32, 24, 16);
    const orbMaterial = new THREE.MeshStandardMaterial({ color: '#c9d4dd', roughness: 0.5 });
    const orbOffsets = [
      [-3, 0.4, -3], [3, 0.4, -3], [-3, 0.4, 3], [3, 0.4, 3],
      [-5, 0.4, 0], [5, 0.4, 0], [0, 0.4, -5], [0, 0.4, 5]
    ];
    orbOffsets.forEach(([x, y, z]) => {
      const orb = new THREE.Mesh(orbGeometry, orbMaterial);
      orb.position.set(x, y, z);
      scene.add(orb);
    });

    // PointLight：intensity 单位为 candela（cd）
    const light = new THREE.PointLight('#fff3d6', 18, 0, 2);
    light.position.set(0, 2.6, 0);
    scene.add(light);

    const helper = new THREE.PointLightHelper(light, 0.32, '#ffd070');
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
    light.intensity = args.intensity;
    light.distance = args.distance;
    light.decay = args.decay;
    helper.update();
    loop.renderOnce();
  },

  readout({ light }) {
    return [
      ['intensity（cd）', light.intensity.toFixed(1)],
      ['distance', light.distance === 0 ? '0 → 无上限' : light.distance.toFixed(1)],
      ['decay', light.decay.toFixed(2)],
      ['light.position', formatVector(light.position)]
    ];
  }
};
