/*
演示 MeshPhysicalMaterial 在 MeshStandardMaterial 之上的两类进阶边界：
- transmission：透射，做玻璃；> 0 时 three.js 走透射渲染通道，背后物体会被折射 / 吸收。
- clearcoat：清漆层，做车漆、漆面；在金属/粗糙表面之上再叠一层高光。

读 create() 时注意三条边界：
1. 透射材质同样依赖环境反射——玻璃的“质感”主要来自表面反射的环境，背后物体靠透射通道采样。
2. transmission > 0 时建议保持 transparent=true，让材质进入透明排序队列；roughness 越低玻璃越通透。
3. clearcoat 是叠在 Standard 之上的第二层高光，clearcoatRoughness 控制这一层的锐度。

输入：transmission、clearcoat。
预期：调 transmission 从 0 到 1，背后彩色方块从清晰可见变成折射变形 + 带反射高光；
      调 clearcoat 从 0 到 1，球面多出一层更锐的反射高光（车漆感）。
读代码先看 create() 怎么配 Physical 的 transmission / thickness / ior，
再看 apply() 怎么把两个滑块写到 material 上。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const physicalMaterialExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1c2026');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(3.0, 1.8, 4.0);
    camera.lookAt(0, 0.65, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // 玻璃：透射 + 环境反射；transparent 让它进透明排序队列
    const material = new THREE.MeshPhysicalMaterial({
      color: '#cfe3f0',
      roughness: 0.05,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 0.6,
      ior: 1.5,
      clearcoat: 0.0,
      clearcoatRoughness: 0.1,
      transparent: true
    });
    const glass = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 64, 40),
      material
    );
    glass.position.set(0, 0.8, 0);
    scene.add(glass);

    // 背景彩色方块：透过玻璃能看到折射变形和颜色吸收
    const colors = ['#c0504d', '#e0a040', '#4a8bbf', '#5fa05f'];
    colors.forEach((c, i) => {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.95, 0.45),
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })
      );
      box.position.set((i - 1.5) * 0.85, 0.48, -1.3);
      scene.add(box);
    });

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#363b42'));
    const key = new THREE.DirectionalLight('#fff3d6', 1.1);
    key.position.set(4, 6, 4);
    scene.add(key);

    const state = { transmission: 0.9, clearcoat: 0.0 };

    function frame(delta) {
      glass.rotation.y += delta * 0.2;
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
    state.transmission = args.transmission;
    state.clearcoat = args.clearcoat;
    material.transmission = args.transmission;
    material.clearcoat = args.clearcoat;
    loop.renderOnce();
  },

  readout({ state }) {
    return [
      ['transmission', state.transmission.toFixed(2)],
      ['clearcoat', state.clearcoat.toFixed(2)],
      ['ior / thickness', '1.5 / 0.6（折射率与厚度）'],
      ['transparent', 'true（transmission > 0 建议保持）']
    ];
  }
};
