/*
演示 PBR 金属面为什么离不开环境贴图。
- metalness：0 = 电介质（塑料、木材），1 = 纯金属（铜、金、铬）。
- roughness：0 = 镜面反射，1 = 完全漫反射。
- envOn：是否给 scene.environment 提供环境反射。

读 create() 时注意两个易踩的边界：
1. metalness=1 的纯金属，整个表面颜色几乎都来自环境反射；没有 scene.environment 时，
   金属面只能反射几盏直接光的镜面高光，其余部分几乎全黑。
2. 运行时把 scene.environment 从纹理切到 null 会改变 shader 的 envMap 分支，
   所以切完要把场景里 PBR 材质的 needsUpdate 设为 true，让程序重新编译。

输入：metalness、roughness、envOn。
预期：envOn=true 时金属反射室内环境，调 roughness 能看到高光从锐到糊；
      envOn=false 且 metalness 接近 1 时，金属面几乎只剩直接光的镜面高光，整体变黑。
读代码先看 create() 怎么用 PMREMGenerator + RoomEnvironment 预烘焙环境反射，
再看 apply() 怎么在 envOn 切换时改 scene.environment 并触发 needsUpdate。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const metalnessEnvironmentExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1d22');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(3.4, 2.2, 4.2);
    camera.lookAt(0, 0.8, 0);

    // 预烘焙一份室内环境反射；envOn 切换时在 null 与这份纹理之间切
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // 金属色：metalness=1 时 color 几乎就是反射色调（F0），而不是漫反射色
    const material = new THREE.MeshStandardMaterial({
      color: '#d8b15a',
      roughness: 0.25,
      metalness: 1.0
    });
    const mesh = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.78, 0.26, 180, 32),
      material
    );
    mesh.position.set(0, 0.95, 0);
    scene.add(mesh);

    // 几个彩色方块摆在周围，让金属反射到的内容更直观
    const padGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
    ['#c0504d', '#e0a040', '#4a8bbf', '#5fa05f'].forEach((c, i) => {
      const pad = new THREE.Mesh(
        padGeo,
        new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 })
      );
      pad.position.set((i - 1.5) * 1.3, 0.3, -1.7);
      scene.add(pad);
    });

    scene.add(new THREE.GridHelper(14, 14, '#5a6168', '#383d44'));

    // 一盏直接光：即使关掉环境，金属面仍能反射它的镜面高光
    const key = new THREE.DirectionalLight('#fff3d6', 1.3);
    key.position.set(4, 6, 4);
    scene.add(key);

    const state = { metalness: 1.0, roughness: 0.25, envOn: true };

    function frame(delta) {
      mesh.rotation.y += delta * 0.25;
      renderer.render(scene, camera);
      emitSnapshot({ material, scene, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { material, scene, envTexture, state, loop };
  },

  apply(instance, args) {
    const { material, scene, envTexture, state, loop } = instance;
    material.metalness = args.metalness;
    material.roughness = args.roughness;
    state.metalness = args.metalness;
    state.roughness = args.roughness;
    state.envOn = args.envOn;

    const previous = scene.environment;
    scene.environment = args.envOn ? envTexture : null;
    // 切换 scene.environment 会改变材质的 envMap 程序分支，必须标记重编译
    if (previous !== scene.environment) {
      material.needsUpdate = true;
    }
    loop.renderOnce();
  },

  readout({ state }) {
    const metalDark = state.metalness > 0.5 && !state.envOn;
    return [
      ['metalness', state.metalness.toFixed(2)],
      ['roughness', state.roughness.toFixed(2)],
      ['scene.environment', state.envOn ? 'RoomEnvironment（PMREM）' : 'null（无环境）'],
      ['金属面', metalDark ? '无环境可反射 → 几乎全黑' : '反射环境 / 直接光']
    ];
  }
};
