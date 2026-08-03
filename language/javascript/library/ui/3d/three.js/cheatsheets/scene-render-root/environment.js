/*
演示 scene.environment 为物理材质提供全局环境光照，不自动成为画布背景。

输入：是否启用 environment、environmentIntensity、environmentRotation Y。
预期：开关环境会改变金属面反射；固定纯色背景保持不变。材质自带 envMap 的球体不受 Scene 环境切换影响。
读文件时先看 create() 里 material.envMap 与 scene.environment 的优先级，再看 apply()。
*/

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const environmentExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1a1d22');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    camera.position.set(4.2, 2.4, 5.2);
    camera.lookAt(0, 0.8, 0);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    const metal = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 48, 32),
      new THREE.MeshStandardMaterial({
        color: '#d8b15a',
        roughness: 0.22,
        metalness: 1
      })
    );
    metal.position.set(-1.15, 0.95, 0);
    scene.add(metal);

    // 单材质 envMap 优先于 Scene.environment；关掉全场环境时它仍保持反射。
    const localEnv = new THREE.Mesh(
      new THREE.SphereGeometry(0.85, 48, 32),
      new THREE.MeshStandardMaterial({
        color: '#9aa7b5',
        roughness: 0.18,
        metalness: 1,
        envMap: envTexture,
        envMapIntensity: 1
      })
    );
    localEnv.position.set(1.15, 0.95, 0);
    scene.add(localEnv);

    scene.add(new THREE.GridHelper(12, 12, '#5a6168', '#383d44'));
    const key = new THREE.DirectionalLight('#fff3d6', 1.2);
    key.position.set(4, 6, 4);
    scene.add(key);

    const state = {
      envOn: true,
      intensity: 1,
      rotationY: 0
    };

    function frame(delta) {
      metal.rotation.y += delta * 0.2;
      localEnv.rotation.y -= delta * 0.15;
      renderer.render(scene, camera);
      emitSnapshot({ scene, metal, localEnv, state });
    }

    const loop = createRenderLoop(canvas, frame);
    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { scene, metal, localEnv, envTexture, state, loop, pmrem };
  },

  apply(instance, args) {
    const { scene, metal, localEnv, envTexture, state, loop } = instance;
    const nextEnv = args.envOn ? envTexture : null;
    const envChanged = scene.environment !== nextEnv;

    scene.environment = nextEnv;
    scene.environmentIntensity = args.environmentIntensity;
    scene.environmentRotation.set(0, THREE.MathUtils.degToRad(args.environmentRotationY), 0);

    // 运行时在纹理与 null 间切换会改 shader 的 envMap 分支，需要 needsUpdate。
    if (envChanged) {
      metal.material.needsUpdate = true;
      localEnv.material.needsUpdate = true;
    }

    state.envOn = args.envOn;
    state.intensity = args.environmentIntensity;
    state.rotationY = args.environmentRotationY;
    loop.renderOnce();
  },

  readout({ scene, state }) {
    return [
      ['scene.background', '固定纯色（未改）'],
      ['scene.environment', state.envOn ? 'RoomEnvironment PMREM' : 'null'],
      ['environmentIntensity', state.intensity.toFixed(2)],
      ['environmentRotation.y', `${state.rotationY.toFixed(0)}°`],
      ['左侧球', '只用 scene.environment'],
      ['右侧球', 'material.envMap 优先']
    ];
  }
};
