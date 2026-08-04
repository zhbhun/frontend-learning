/*
演示 MeshStandardMaterial 入口：color / roughness / metalness 如何改变表面观感。
本课不展开环境贴图；金属面在无 IBL 时偏暗是预期，深讲见 PBR 课。

输入：color、roughness、metalness。
预期：roughness 低时高光更锐；metalness 升高时更依赖镜面反射、漫反射变弱。
读代码先看材质默认值，再看 apply() 的三项写入。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshStandardMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.2, 2.8, 5.2);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.4,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.72, 0.24, 160, 24),
      material
    );
    mesh.position.y = 1.05;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(3.5, 6, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.55));

    function frame(delta) {
      mesh.rotation.y += delta * 0.35;
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
    material.color.set(args.color);
    material.roughness = args.roughness;
    material.metalness = args.metalness;
    loop.renderOnce();
  },

  readout({ material }) {
    return [
      ['材质', 'MeshStandardMaterial'],
      ['color', `#${material.color.getHexString()}`],
      ['roughness', material.roughness.toFixed(2)],
      ['metalness', material.metalness.toFixed(2)],
      [
        '提示',
        material.metalness > 0.7
          ? '高金属度无环境贴图时偏暗 → 见 PBR 课'
          : '当前主要靠直接光'
      ]
    ];
  }
};
