/*
演示 MeshPhongMaterial 的高光由 specular 颜色和 shininess 共同决定：
- specular：高光的颜色，黑则无高光（接近 Lambert），白则满高光。
- shininess：高光锐度，值越大高光越集中越亮，值越小越分散越柔和。

输入：shininess（高光锐度）、specularIntensity（高光强度，乘到 specular 颜色上）。
读 create() 看 specular / shininess 的初值；读 apply() 看强度如何乘进 specular 颜色。
注意：MeshPhongMaterial 用非物理的 Blinn-Phong 模型，开销低于 PBR，但精确度不如 Standard。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const BASE_SPECULAR = new THREE.Color('#ffffff');

export const meshPhongExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 30);
    camera.position.set(4.5, 3.0, 5.5);
    camera.lookAt(0, 1.0, 0);

    const geometry = new THREE.TorusKnotGeometry(0.9, 0.3, 128, 24);
    const material = new THREE.MeshPhongMaterial({
      color: '#7a4a2a',
      specular: '#ffffff',
      shininess: 70
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(0, 1.0, 0);
    scene.add(mesh);

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#42484f'));

    // 单一方向光让高光锐度变化最明显
    const key = new THREE.DirectionalLight('#fff3d6', 2.4);
    key.position.set(4, 6, 4);
    scene.add(key);
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.3));

    const state = { shininess: 70, specularIntensity: 1 };

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
    material.shininess = args.shininess;
    // 强度 0 时 specular 全黑，材质退化为接近 Lambert 的纯漫反射
    material.specular.copy(BASE_SPECULAR).multiplyScalar(args.specularIntensity);
    state.shininess = args.shininess;
    state.specularIntensity = args.specularIntensity;
    loop.renderOnce();
  },

  readout({ material, state }) {
    return [
      ['shininess', state.shininess.toFixed(0)],
      ['specular 颜色', `#${material.specular.getHexString()}`],
      ['光照模型', 'Blinn-Phong（非物理）']
    ];
  }
};
