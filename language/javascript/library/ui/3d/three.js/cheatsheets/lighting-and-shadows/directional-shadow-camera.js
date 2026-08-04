/*
演示 DirectionalLight 的阴影范围由正交阴影相机决定。

输入：
- halfExtent：shadow.camera 的 left/right/top/bottom 半宽
- near / far：阴影相机裁剪面

预期：半宽过小 → CameraHelper 盒子盖不住物体，阴影被裁；半宽过大 → 同一 mapSize 下阴影变糊。
读代码先看 create() 里 shadow.camera 与 CameraHelper，再看 apply() 改 frustum 后 updateProjectionMatrix。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const directionalShadowCameraExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 80);
    camera.position.set(9, 8, 11);
    camera.lookAt(0, 0.5, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 24),
      new THREE.MeshStandardMaterial({ color: '#3a3f47', roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const pillar = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 1.1),
      new THREE.MeshStandardMaterial({ color: '#c9b896', roughness: 0.45 })
    );
    pillar.position.set(0, 1.1, 0);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);

    // 远处再放一根柱，方便观察 frustum 裁切
    const farPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.6, 0.9),
      new THREE.MeshStandardMaterial({ color: '#7a9ec7', roughness: 0.5 })
    );
    farPillar.position.set(4.5, 0.8, -3.2);
    farPillar.castShadow = true;
    farPillar.receiveShadow = true;
    scene.add(farPillar);

    const key = new THREE.DirectionalLight('#fff3d6', 3.0);
    key.position.set(5, 10, 4);
    key.target.position.set(0, 0.5, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(512, 512);
    key.shadow.camera.left = -4;
    key.shadow.camera.right = 4;
    key.shadow.camera.top = 4;
    key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 30;
    key.shadow.bias = -0.0003;
    scene.add(key);
    scene.add(key.target);

    const cameraHelper = new THREE.CameraHelper(key.shadow.camera);
    scene.add(cameraHelper);

    scene.add(new THREE.HemisphereLight('#6a7588', '#2a2d33', 0.35));

    const state = { halfExtent: 4, near: 1, far: 30 };

    function frame() {
      // 每帧刷新 helper：shadow.camera 世界矩阵随 light 更新
      key.updateMatrixWorld();
      key.shadow.camera.updateMatrixWorld();
      cameraHelper.update();
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
      key,
      cameraHelper,
      state,
      loop,
      dispose() {
        loop.dispose();
        resizeObserver.disconnect();
        if (key.shadow.map) {
          key.shadow.map.dispose();
          key.shadow.map = null;
        }
        cameraHelper.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    const { key, cameraHelper, state, loop } = instance;
    state.halfExtent = args.halfExtent;
    state.near = args.near;
    state.far = args.far;

    const cam = key.shadow.camera;
    cam.left = -args.halfExtent;
    cam.right = args.halfExtent;
    cam.top = args.halfExtent;
    cam.bottom = -args.halfExtent;
    cam.near = args.near;
    cam.far = args.far;
    cam.updateProjectionMatrix();
    cameraHelper.update();
    loop.renderOnce();
  },

  readout({ state, key }) {
    const cam = key.shadow.camera;
    const span = cam.right - cam.left;
    return [
      ['shadow.camera 半宽', state.halfExtent.toFixed(1)],
      ['覆盖边长', span.toFixed(1)],
      ['near / far', `${cam.near.toFixed(1)} / ${cam.far.toFixed(1)}`],
      ['mapSize', `${key.shadow.mapSize.x}²（固定）`],
      [
        '观察',
        state.halfExtent <= 2.5
          ? '范围偏小 → 易裁影'
          : state.halfExtent >= 10
            ? '范围偏大 → 同分辨率更糊'
            : '范围与场景大致匹配'
      ]
    ];
  }
};
