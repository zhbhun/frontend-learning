/*
演示 MeshLambertMaterial：只做漫反射，没有镜面高光。

输入：DirectionalLight.intensity。
预期：球体明暗随光变，但表面不会出现锐利高光点。
读代码先看材质类型，再对照 Phong 范例的 shininess。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshLambertMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.2, 2.8, 5.2);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshLambertMaterial({ color: '#3d73d9' });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), material);
    mesh.position.y = 1.05;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const light = new THREE.DirectionalLight('#ffffff', 2.8);
    light.position.set(3.2, 5.5, 3.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight('#ffffff', 0.35));

    function frame(delta) {
      mesh.rotation.y += delta * 0.4;
      renderer.render(scene, camera);
      emitSnapshot({ light, material });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { light, material, loop };
  },

  apply(instance, args) {
    const { light, loop } = instance;
    light.intensity = args.intensity;
    loop.renderOnce();
  },

  readout({ light, material }) {
    return [
      ['材质', 'MeshLambertMaterial'],
      ['specular', '无（仅漫反射）'],
      ['color', `#${material.color.getHexString()}`],
      ['DirectionalLight.intensity', light.intensity.toFixed(2)]
    ];
  }
};
