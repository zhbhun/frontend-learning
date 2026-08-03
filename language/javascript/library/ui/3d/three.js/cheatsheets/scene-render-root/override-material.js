/*
演示 scene.overrideMaterial 临时替换允许覆盖的材质，几何与变换不变。

输入：是否启用 overrideMaterial。
预期：开启后多数物体变成法线材质；橙色球因 allowOverride=false 保留原色。
读文件时先看 create() 里 allowOverride，再看 apply() 如何写入 / 清空 scene.overrideMaterial。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize,
  rotateObjects
} from '../../assets/shared-scene.js';

export const overrideMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#dbe8e1');

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(6, 4.5, 8);
    camera.lookAt(0, 0.8, 0);

    const materials = ['#3d73d9', '#d17832', '#2f8b72'].map(
      (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.45 })
    );
    materials[1].allowOverride = false;

    const objects = [
      new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.3, 1.3), materials[0]),
      new THREE.Mesh(new THREE.SphereGeometry(0.8, 28, 18), materials[1]),
      new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.18, 72, 12), materials[2])
    ];
    objects[0].position.set(-2.2, 0.85, 0);
    objects[1].position.set(0, 0.85, 0);
    objects[2].position.set(2.2, 0.85, 0);
    objects.forEach((mesh) => scene.add(mesh));

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: '#cbd8d0', roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    const key = new THREE.DirectionalLight('#ffffff', 2.2);
    key.position.set(4, 7, 5);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.8), key);

    const overrideMaterial = new THREE.MeshNormalMaterial();
    const state = { override: false };

    function frame(delta) {
      rotateObjects(objects, delta);
      renderer.render(scene, camera);
      emitSnapshot({ scene, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, overrideMaterial, state, loop };
  },

  apply(instance, args) {
    const { scene, overrideMaterial, state, loop } = instance;
    state.override = args.overrideMaterial;
    scene.overrideMaterial = args.overrideMaterial ? overrideMaterial : null;
    loop.renderOnce();
  },

  readout({ scene, state }) {
    return [
      ['overrideMaterial', state.override ? 'MeshNormalMaterial' : 'null'],
      ['橙色球', 'allowOverride = false'],
      ['其余物体', state.override ? '已被覆盖' : '原材质']
    ];
  }
};
