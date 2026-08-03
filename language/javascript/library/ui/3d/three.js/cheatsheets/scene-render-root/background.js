/*
演示 scene.background 只填充没有物体覆盖的像素，不照亮物体。

输入：背景模式（纯色 / 环境贴图）、纯色、Intensity、Blurriness、Rotation Y。
预期：改背景只改底图像素；物体明暗不变。Blurriness / Intensity / Rotation 只对兼容的环境背景纹理生效。
读文件时先看 apply()：environment 始终为 null，用来证明背景不是照明。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const backgroundExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    // 刻意不设 environment：背景变化不应改变物体明暗。
    scene.environment = null;

    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 40);
    camera.position.set(4.8, 2.8, 5.6);
    camera.lookAt(0, 0.7, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envBackground = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.4, metalness: 0.15 })
    );
    mesh.position.y = 0.8;
    scene.add(mesh);

    scene.add(new THREE.GridHelper(10, 10, '#8ba096', '#d3ded7'));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(3, 5, 4);
    scene.add(new THREE.HemisphereLight('#ffffff', '#71837b', 0.75), key);

    const state = {
      mode: '纯色',
      intensity: 1,
      blurriness: 0,
      rotationY: 0
    };

    function frame(delta) {
      mesh.rotation.y += delta * 0.35;
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

    return { scene, envBackground, state, loop, pmrem };
  },

  apply(instance, args) {
    const { scene, envBackground, state, loop } = instance;
    state.mode = args.mode;
    state.intensity = args.backgroundIntensity;
    state.blurriness = args.backgroundBlurriness;
    state.rotationY = args.backgroundRotationY;

    if (args.mode === '环境贴图') {
      scene.background = envBackground;
      scene.backgroundIntensity = args.backgroundIntensity;
      scene.backgroundBlurriness = args.backgroundBlurriness;
      scene.backgroundRotation.set(0, THREE.MathUtils.degToRad(args.backgroundRotationY), 0);
    } else {
      scene.background = new THREE.Color(args.background);
      scene.backgroundIntensity = 1;
      scene.backgroundBlurriness = 0;
      scene.backgroundRotation.set(0, 0, 0);
    }

    loop.renderOnce();
  },

  readout({ scene, state }) {
    const backgroundLabel =
      state.mode === '环境贴图'
        ? '环境贴图'
        : scene.background
          ? `#${scene.background.getHexString()}`
          : 'null';

    return [
      ['scene.background', backgroundLabel],
      ['scene.environment', scene.environment ? '已设置' : 'null'],
      ['backgroundIntensity', state.mode === '环境贴图' ? state.intensity.toFixed(2) : '纯色无效'],
      ['backgroundBlurriness', state.mode === '环境贴图' ? state.blurriness.toFixed(2) : '纯色无效'],
      ['backgroundRotation.y', state.mode === '环境贴图' ? `${state.rotationY.toFixed(0)}°` : '纯色无效']
    ];
  }
};
