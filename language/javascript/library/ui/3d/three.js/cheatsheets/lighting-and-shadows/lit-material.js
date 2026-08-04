/*
演示明暗来自「受光材质 × Light」：MeshBasicMaterial 不响应光，MeshStandardMaterial 才有亮面与背光面。

输入：
- materialKind：basic / standard
- intensity：DirectionalLight.intensity

预期：切到 basic 时整块颜色均匀，调 intensity 无效；切到 standard 时随 intensity 出现明暗层次。
读代码先看 apply() 如何切换材质，再看 frame() 只渲染、不改阴影（本范例不开 shadowMap）。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const litMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(5.2, 3.6, 6.4);
    camera.lookAt(0, 0.7, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    scene.add(ground);
    scene.add(new THREE.GridHelper(14, 14, '#5a6168', '#42484f'));

    const basicMat = new THREE.MeshBasicMaterial({ color: '#3d73d9' });
    const standardMat = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.45,
      metalness: 0.05
    });

    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), standardMat);
    mesh.position.y = 0.7;
    scene.add(mesh);

    const key = new THREE.DirectionalLight('#fff3d6', 3.0);
    key.position.set(3.2, 5.2, 2.8);
    key.target.position.set(0, 0.7, 0);
    scene.add(key);
    scene.add(key.target);

    // 弱填充，避免 standard 背光面死黑，便于对比 basic 的“无明暗”
    scene.add(new THREE.HemisphereLight('#6a7588', '#2a2d33', 0.35));

    const state = { materialKind: 'standard', intensity: 3.0 };

    function frame(delta) {
      mesh.rotation.y += delta * 0.35;
      renderer.render(scene, camera);
      emitSnapshot({ state, key });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return {
      mesh,
      basicMat,
      standardMat,
      key,
      state,
      loop,
      dispose() {
        loop.dispose();
        resizeObserver.disconnect();
        renderer.dispose();
        basicMat.dispose();
        standardMat.dispose();
        mesh.geometry.dispose();
        ground.geometry.dispose();
        ground.material.dispose();
      }
    };
  },

  apply(instance, args) {
    const { mesh, basicMat, standardMat, key, state, loop } = instance;
    state.materialKind = args.materialKind;
    state.intensity = args.intensity;
    key.intensity = args.intensity;
    mesh.material = args.materialKind === 'basic' ? basicMat : standardMat;
    loop.renderOnce();
  },

  readout({ state, key }) {
    const lit = state.materialKind === 'standard';
    return [
      ['材质', lit ? 'MeshStandardMaterial（受光）' : 'MeshBasicMaterial（不受光）'],
      ['DirectionalLight.intensity', key.intensity.toFixed(2)],
      ['明暗', lit ? '随法线与光强变化' : '颜色恒定，调 intensity 无效']
    ];
  }
};
