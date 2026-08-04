/*
演示 MeshToonMaterial：用离散 gradientMap 把连续光照压成卡通分档。

输入：分档数 steps（重写 gradientMap）。
预期：steps 少时明暗块面少而硬，steps 多时接近连续明暗。
读代码先看 createToonGradient()，再看 apply() 如何替换 gradientMap。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

function createToonGradient(steps) {
  const count = Math.max(2, Math.floor(steps));
  const data = new Uint8Array(count * 4);

  for (let i = 0; i < count; i += 1) {
    const value = Math.round((i / (count - 1)) * 255);
    const offset = i * 4;
    data[offset] = value;
    data[offset + 1] = value;
    data[offset + 2] = value;
    data[offset + 3] = 255;
  }

  const texture = new THREE.DataTexture(data, count, 1);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.needsUpdate = true;
  return texture;
}

export const meshToonMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.2, 2.8, 5.2);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshToonMaterial({
      color: '#3d73d9',
      gradientMap: createToonGradient(3)
    });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 32), material);
    mesh.position.y = 1.05;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const light = new THREE.DirectionalLight('#ffffff', 2.4);
    light.position.set(3.2, 5.5, 3.5);
    scene.add(light);
    scene.add(new THREE.AmbientLight('#ffffff', 0.25));

    const state = { steps: 3 };

    function frame(delta) {
      mesh.rotation.y += delta * 0.4;
      renderer.render(scene, camera);
      emitSnapshot({ state });
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
    const previous = material.gradientMap;
    material.gradientMap = createToonGradient(args.steps);
    previous?.dispose();
    state.steps = Math.max(2, Math.floor(args.steps));
    loop.renderOnce();
  },

  readout({ state }) {
    return [
      ['材质', 'MeshToonMaterial'],
      ['gradientMap 分档', String(state.steps)],
      ['观感', state.steps <= 3 ? '硬分档卡通' : '更接近连续明暗']
    ];
  }
};
