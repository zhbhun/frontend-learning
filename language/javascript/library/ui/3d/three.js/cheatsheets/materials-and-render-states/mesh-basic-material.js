/*
演示 MeshBasicMaterial 不受光：同场景、同灯光下，Basic 亮度不随 intensity 变化，
旁侧 MeshStandardMaterial 会变亮或变暗。

输入：DirectionalLight.intensity。
预期：左侧 Basic 颜色恒定；右侧 Standard 随 intensity 改变明暗。
读代码先看两个 mesh 的材质差异，再看 apply() 只改 light.intensity。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshBasicMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(5.2, 3.4, 6.4);
    camera.lookAt(0, 0.9, 0);

    const geometry = new THREE.SphereGeometry(0.85, 48, 32);

    const basic = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: '#3d73d9' })
    );
    basic.position.set(-1.35, 0.95, 0);
    scene.add(basic);

    const standard = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: '#3d73d9',
        roughness: 0.45,
        metalness: 0.05
      })
    );
    standard.position.set(1.35, 0.95, 0);
    scene.add(standard);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));

    const light = new THREE.DirectionalLight('#ffffff', 2.5);
    light.position.set(3.5, 6, 4);
    scene.add(light);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.35));

    function frame(delta) {
      basic.rotation.y += delta * 0.35;
      standard.rotation.y += delta * 0.35;
      renderer.render(scene, camera);
      emitSnapshot({ light });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { light, loop };
  },

  apply(instance, args) {
    const { light, loop } = instance;
    light.intensity = args.intensity;
    loop.renderOnce();
  },

  readout({ light }) {
    return [
      ['左侧材质', 'MeshBasicMaterial（不受光）'],
      ['右侧材质', 'MeshStandardMaterial（受光）'],
      ['DirectionalLight.intensity', light.intensity.toFixed(2)]
    ];
  }
};
