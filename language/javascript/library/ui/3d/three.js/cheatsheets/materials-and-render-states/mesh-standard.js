/*
演示 MeshStandardMaterial 的 metalness / roughness 如何决定 PBR 表面外观：
- metalness：金属度，0 = 电介质（塑料、木材），1 = 纯金属（铜、金）。
- roughness：表面粗糙度，0 = 镜面反射（高光锐），1 = 完全漫反射（哑光）。

输入：metalness、roughness。
读 create() 时注意两个易踩的边界：
1. PBR 没有环境反射时，metalness=1 的金属面会全黑——这里用 PMREMGenerator + RoomEnvironment
   生成一份室内环境反射给 scene.environment，金属面才有内容可反射。
2. Scene 没有 environment 时，MeshStandardMaterial 的金属部分只能反射直接光源，几乎看不见。
   环境贴图的更多细节（hdr 加载、prefilter、envMapIntensity）留给 5.1.1 PBR 课。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const meshStandardExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(4.5, 3.0, 5.5);
    camera.lookAt(0, 1.0, 0);

    // 给 PBR 一个环境反射入口；没有它，metalness=1 的金属面会全黑
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const geometry = new THREE.TorusKnotGeometry(0.9, 0.3, 128, 24);
    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.4,
      metalness: 0.6
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1.0, 0);
    scene.add(mesh);

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#42484f'));

    const key = new THREE.DirectionalLight('#fff3d6', 1.6);
    key.position.set(4, 6, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.3));

    const state = { metalness: 0.6, roughness: 0.4 };

    function frame(delta) {
      mesh.rotation.y += delta * 0.3;
      renderer.render(scene, camera);
      emitSnapshot({ material, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { material, state, loop };
  },

  apply(instance, args) {
    const { material, state, loop } = instance;
    material.metalness = args.metalness;
    material.roughness = args.roughness;
    state.metalness = args.metalness;
    state.roughness = args.roughness;
    loop.renderOnce();
  },

  readout({ state }) {
    return [
      ['metalness', state.metalness.toFixed(2)],
      ['roughness', state.roughness.toFixed(2)],
      ['光照模型', 'PBR（微表面）'],
      ['环境反射', 'PMREM RoomEnvironment（必需，否则金属面黑）']
    ];
  }
};
