/*
演示 shadow map 质量参数：mapSize、shadowMap.type、bias / normalBias。

输入：
- mapSize：256 / 512 / 1024 / 2048
- type：basic / pcf / vsm（PCFSoft 在当前版本已弃用并回退到 PCF）
- bias / normalBias：深度偏移，用来对照 acne 与 peter-panning

预期：提高 mapSize 边缘更清晰；Basic 块状、PCF 默认、VSM 更软但接收物也会投影；
      bias 过大阴影与物体脱开（peter-panning），过小或 0 易出现条纹 acne。
读代码先看 recreateShadowMap()：改 mapSize 必须丢掉旧 shadow.map 才会重建。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

const TYPE_MAP = {
  basic: THREE.BasicShadowMap,
  pcf: THREE.PCFShadowMap,
  vsm: THREE.VSMShadowMap
};

const TYPE_LABEL = {
  basic: 'BasicShadowMap',
  pcf: 'PCFShadowMap',
  vsm: 'VSMShadowMap'
};

export const shadowMapQualityExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60);
    camera.position.set(6.5, 4.8, 7.8);
    camera.lookAt(0, 0.7, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.55, 0.2, 140, 18),
      new THREE.MeshStandardMaterial({ color: '#d4c4a0', roughness: 0.35, metalness: 0.12 })
    );
    knot.position.set(0, 1.15, 0);
    knot.castShadow = true;
    knot.receiveShadow = true;
    scene.add(knot);

    const key = new THREE.DirectionalLight('#fff3d6', 3.2);
    key.position.set(4.5, 8, 3.5);
    key.target.position.set(0, 0.8, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 28;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0;
    key.shadow.radius = 1;
    scene.add(key);
    scene.add(key.target);

    scene.add(new THREE.HemisphereLight('#6a7588', '#2a2d33', 0.35));

    const state = {
      mapSize: 512,
      type: 'pcf',
      bias: -0.0002,
      normalBias: 0
    };

    function recreateShadowMap() {
      if (key.shadow.map) {
        key.shadow.map.dispose();
        key.shadow.map = null;
      }
      if (key.shadow.mapPass) {
        key.shadow.mapPass.dispose();
        key.shadow.mapPass = null;
      }
    }

    function frame(delta) {
      knot.rotation.y += delta * 0.35;
      renderer.render(scene, camera);
      emitSnapshot({ state, key, renderer });
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
      renderer,
      key,
      state,
      loop,
      recreateShadowMap,
      dispose() {
        loop.dispose();
        resizeObserver.disconnect();
        recreateShadowMap();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    const { renderer, key, state, loop, recreateShadowMap } = instance;
    const mapSizeChanged = state.mapSize !== args.mapSize;
    const typeChanged = state.type !== args.type;

    state.mapSize = args.mapSize;
    state.type = args.type;
    state.bias = args.bias;
    state.normalBias = args.normalBias;

    key.shadow.mapSize.set(args.mapSize, args.mapSize);
    key.shadow.bias = args.bias;
    key.shadow.normalBias = args.normalBias;
    renderer.shadowMap.type = TYPE_MAP[args.type] ?? THREE.PCFShadowMap;

    // mapSize / type 变化后丢掉旧贴图，下一帧 render 时重建
    if (mapSizeChanged || typeChanged) {
      recreateShadowMap();
    }

    loop.renderOnce();
  },

  readout({ state, key }) {
    const acneHint = state.bias >= 0 && state.normalBias <= 0;
    const panningHint = state.bias <= -0.003;
    return [
      ['mapSize', `${state.mapSize}²`],
      ['shadowMap.type', TYPE_LABEL[state.type]],
      ['shadow.bias', key.shadow.bias.toFixed(4)],
      ['shadow.normalBias', key.shadow.normalBias.toFixed(3)],
      [
        '伪影提示',
        panningHint
          ? 'bias 过负 → 易 peter-panning（影与物体脱开）'
          : acneHint
            ? 'bias≈0 且无 normalBias → 易 acne（条纹）'
            : '当前偏移在常用区间'
      ]
    ];
  }
};
