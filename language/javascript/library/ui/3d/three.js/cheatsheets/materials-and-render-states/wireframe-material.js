/*
演示材质 wireframe：同一 Mesh 开/关线框，形状仍是三角形网格，不是 Line 对象。

输入：wireframe。
预期：开启后只画边；WebGL 线宽通常固定为 1 像素。
读代码看 material.wireframe 的开关即可。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const wireframeMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.4, 3.0, 5.4);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.45,
      wireframe: false
    });
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.15, 1),
      material
    );
    mesh.position.y = 1.15;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const key = new THREE.DirectionalLight('#ffffff', 2.4);
    key.position.set(3.5, 6, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.5));

    function frame(delta) {
      mesh.rotation.y += delta * 0.4;
      mesh.rotation.x += delta * 0.15;
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
    material.wireframe = args.wireframe;
    loop.renderOnce();
  },

  readout({ material }) {
    return [
      ['wireframe', String(material.wireframe)],
      ['对象类型', 'Mesh（不是 Line）'],
      ['WebGL 线宽', '通常固定 1px']
    ];
  }
};
