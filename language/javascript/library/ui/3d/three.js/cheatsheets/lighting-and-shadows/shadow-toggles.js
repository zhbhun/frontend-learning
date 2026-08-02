/*
演示阴影开关链路：renderer.shadowMap.enabled、light.castShadow、mesh.castShadow、
ground.receiveShadow 四处开关必须同时打开，阴影才会出现。

输入是四个开关的布尔值。
主要对象：
- light：DirectionalLight，主光。castShadow 控制这盏光是否参与阴影计算。
- statue：TorusKnot 雕塑，castShadow 控制它是否作为投射物。
- ground：地面，receiveShadow 控制它是否接收阴影。
- renderer：renderer.shadowMap.enabled 是总开关，关掉后所有光源都不投影。
预期结果：四个开关默认全开，雕塑在地面上投出阴影；关掉任一个，阴影从画面中消失。
读代码先看 create() 中四处开关的初始值，再看 syncToggles() 怎么按 args 同步。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const shadowTogglesExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    // 总开关：关掉它，所有光源的 castShadow 都失效
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(5.5, 4.2, 7);
    camera.lookAt(0, 0.9, 0);

    // 地面：receiveShadow 控制是否把阴影画在自己身上
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshStandardMaterial({ color: '#4a515a', roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new THREE.GridHelper(14, 14, '#5a6168', '#3a3f47'));

    // 受光雕塑：castShadow 控制是否作为投射物
    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.55, 0.2, 110, 16),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.35, metalness: 0.15 })
    );
    statue.position.set(0, 1.25, 0);
    statue.castShadow = true;
    scene.add(statue);

    // 主光：castShadow 控制这盏光是否产生 shadow map
    const light = new THREE.DirectionalLight('#fff3d6', 3.0);
    light.position.set(3.2, 5, 3.2);
    light.target.position.set(0, 1.25, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.left = -4;
    light.shadow.camera.right = 4;
    light.shadow.camera.top = 4;
    light.shadow.camera.bottom = -4;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 15;
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.bias = -0.0005;
    scene.add(light);
    scene.add(light.target);

    // 弱填充光，让背光面不至于完全死黑，方便观察阴影是否落在地面上
    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.4));

    const state = {
      rendererEnabled: true,
      lightCast: true,
      meshCast: true,
      groundReceive: true
    };

    function syncToggles() {
      renderer.shadowMap.enabled = state.rendererEnabled;
      light.castShadow = state.lightCast;
      statue.castShadow = state.meshCast;
      ground.receiveShadow = state.groundReceive;
    }

    syncToggles();

    function frame(delta) {
      statue.rotation.y += delta * 0.3;
      renderer.render(scene, camera);
      emitSnapshot({ state });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { state, loop, syncToggles };
  },

  apply(instance, args) {
    const { state, loop, syncToggles } = instance;
    state.rendererEnabled = args.rendererEnabled;
    state.lightCast = args.lightCast;
    state.meshCast = args.meshCast;
    state.groundReceive = args.groundReceive;
    syncToggles();
    loop.renderOnce();
  },

  readout({ state }) {
    const broken = [];
    if (!state.rendererEnabled) broken.push('renderer.shadowMap.enabled');
    if (!state.lightCast) broken.push('light.castShadow');
    if (!state.meshCast) broken.push('mesh.castShadow');
    if (!state.groundReceive) broken.push('mesh.receiveShadow');

    return [
      ['renderer.shadowMap.enabled', state.rendererEnabled ? '开' : '关'],
      ['light.castShadow', state.lightCast ? '开' : '关'],
      ['mesh.castShadow（投射物）', state.meshCast ? '开' : '关'],
      ['mesh.receiveShadow（接收物）', state.groundReceive ? '开' : '关'],
      ['阴影链路', broken.length === 0 ? '完整 → 阴影出现' : `断裂 → 缺 ${broken[0]}`]
    ];
  }
};
