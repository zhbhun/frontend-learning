/*
演示 MeshMatcapMaterial：用一张 MatCap 贴图烘焙视角相关明暗，场景里没有 Direct Light
也能有高光造型。

输入：matcap 预设（冷钢 / 暖陶 / 翠玉）。
预期：换贴图后球体明暗风格立刻变，且场景无 DirectionalLight。
读代码先看 createMatcapTexture()，再看 apply() 替换 material.matcap。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

function createMatcapTexture(preset) {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const palettes = {
    steel: ['#ffffff', '#c5d2e4', '#5a6f8a', '#1c2430'],
    clay: ['#fff4e8', '#e0a878', '#8a4e2e', '#2a1810'],
    jade: ['#e8fff4', '#7dccaa', '#2f7a5c', '#0f2a22']
  };
  const [c0, c1, c2, c3] = palettes[preset] ?? palettes.steel;

  const gradient = ctx.createRadialGradient(
    size * 0.34,
    size * 0.32,
    size * 0.04,
    size * 0.5,
    size * 0.52,
    size * 0.56
  );
  gradient.addColorStop(0, c0);
  gradient.addColorStop(0.28, c1);
  gradient.addColorStop(0.68, c2);
  gradient.addColorStop(1, c3);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export const meshMatcapMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
    camera.position.set(4.2, 2.8, 5.2);
    camera.lookAt(0, 0.9, 0);

    const material = new THREE.MeshMatcapMaterial({
      matcap: createMatcapTexture('steel')
    });
    const mesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.72, 0.24, 160, 24),
      material
    );
    mesh.position.y = 1.05;
    scene.add(mesh);

    // 刻意不加 Direct Light：MatCap 的明暗来自贴图，不来自场景光
    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));

    const state = { preset: 'steel' };

    function frame(delta) {
      mesh.rotation.y += delta * 0.35;
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
    const previous = material.matcap;
    material.matcap = createMatcapTexture(args.preset);
    previous?.dispose();
    state.preset = args.preset;
    loop.renderOnce();
  },

  readout({ state }) {
    const labels = { steel: '冷钢', clay: '暖陶', jade: '翠玉' };
    return [
      ['材质', 'MeshMatcapMaterial'],
      ['matcap 预设', labels[state.preset] ?? state.preset],
      ['场景 Direct Light', '无（明暗来自 MatCap）']
    ];
  }
};
