/*
演示 MeshPhongMaterial 的镜面高光：调 shininess 改变高光锐度。

输入：shininess、specular 亮度（用灰度近似）。
预期：shininess 低时高光大而软，高时小而锐；specular 变暗时高光减弱。
读代码先看 MeshPhongMaterial 构造，再看 apply() 写入 shininess / specular。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshPhongMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.2, 2.8, 5.2);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshPhongMaterial({
      color: '#3d73d9',
      specular: '#ffffff',
      shininess: 40
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), material);
    mesh.position.y = 1.05;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const light = new THREE.DirectionalLight('#ffffff', 2.8);
    light.position.set(3.2, 5.5, 3.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight('#ffffff', 0.3));

    function frame(delta) {
      mesh.rotation.y += delta * 0.4;
      renderer.render(scene, camera);
      emitSnapshot({ material });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { material, loop };
  },

  apply(instance, args) {
    const { material, loop } = instance;
    material.shininess = args.shininess;
    material.specular.setScalar(args.specular);
    loop.renderOnce();
  },

  readout({ material }) {
    return [
      ['材质', 'MeshPhongMaterial'],
      ['shininess', material.shininess.toFixed(0)],
      ['specular', material.specular.getStyle()],
      ['高光', material.shininess < 20 ? '大而软' : material.shininess > 80 ? '小而锐' : '中等']
    ];
  }
};
