/*
演示阴影质量由 shadow.mapSize（分辨率）与 shadow.camera 范围（覆盖区域）共同决定。
有效纹素密度 ≈ mapSize / camera 范围：固定 mapSize 时调大 camera 范围，每个纹素覆盖
更多世界空间，阴影变糊；固定范围时调大 mapSize，纹素更密，阴影更清晰。

输入是 mapSize（512 / 1024 / 2048）和 camera 半范围（2 ~ 12）。
主要对象：
- light：DirectionalLight，主光。light.shadow.camera 是 OrthographicCamera，left/right/top/bottom
  决定阴影相机覆盖的世界区域；shadow.mapSize 决定 shadow map 纹理分辨率。
- shadowCamHelper：CameraHelper(light.shadow.camera)，画出阴影相机的正交视锥，让范围变化可见。
预期结果：调大 range，视锥盒变大、阴影变糊；调大 mapSize，阴影边缘更清晰。
读代码先看 applyShadowCamera() 和 applyMapSize() 两个分支。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  createRenderLoop,
  readCanvasSize
} from '../../assets/shared-scene.js';

export const shadowQualityExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#232830');

    const renderCamera = new THREE.PerspectiveCamera(42, 1, 0.1, 60);
    renderCamera.position.set(7.5, 5.8, 9.5);
    renderCamera.lookAt(0, 0.7, 0);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.MeshStandardMaterial({ color: '#4a515a', roughness: 0.92 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    scene.add(new THREE.GridHelper(18, 18, '#5a6168', '#3a3f47'));

    // 几个高低不同的物体，让阴影清晰可见、便于对比边缘锐度
    const statue = new THREE.Mesh(
      new THREE.TorusKnotGeometry(0.5, 0.18, 110, 16),
      new THREE.MeshStandardMaterial({ color: '#e8d8b5', roughness: 0.35 })
    );
    statue.position.set(0, 1.1, 0);
    statue.castShadow = true;
    scene.add(statue);

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1.4, 0.7),
      new THREE.MeshStandardMaterial({ color: '#d17832', roughness: 0.5 })
    );
    box.position.set(-1.8, 0.7, 0.9);
    box.castShadow = true;
    scene.add(box);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 28, 18),
      new THREE.MeshStandardMaterial({ color: '#3d73d9', roughness: 0.45 })
    );
    sphere.position.set(1.8, 0.5, -0.7);
    sphere.castShadow = true;
    scene.add(sphere);

    // 主光：DirectionalLight，shadow.camera 是 OrthographicCamera
    const light = new THREE.DirectionalLight('#fff3d6', 3.0);
    light.position.set(3.5, 5.5, 3.5);
    light.target.position.set(0, 0.6, 0);
    light.castShadow = true;
    light.shadow.mapSize.set(1024, 1024);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 16;
    light.shadow.camera.left = -4;
    light.shadow.camera.right = 4;
    light.shadow.camera.top = 4;
    light.shadow.camera.bottom = -4;
    light.shadow.camera.updateProjectionMatrix();
    light.shadow.bias = -0.0005;
    scene.add(light);
    scene.add(light.target);

    scene.add(new THREE.HemisphereLight('#5a6677', '#2a2d33', 0.4));

    // 用 CameraHelper 把阴影相机的正交视锥画出来，让 camera 范围的变化直接可见。
    // shadow.camera 的 matrixWorld 由 renderer 在 shadow pass 内更新，
    // 因此每帧 render 之后再 update() helper，线框才跟着范围变化。
    const shadowCamHelper = new THREE.CameraHelper(light.shadow.camera);
    scene.add(shadowCamHelper);

    const state = { mapSize: 1024, range: 4 };

    function applyShadowCamera() {
      const r = state.range;
      light.shadow.camera.left = -r;
      light.shadow.camera.right = r;
      light.shadow.camera.top = r;
      light.shadow.camera.bottom = -r;
      light.shadow.camera.updateProjectionMatrix();
    }

    function applyMapSize() {
      // three.js 只在 shadow.map 为 null 时重建纹理；
      // 改完 mapSize 要手动 dispose 旧纹理并把 map 置空，新尺寸才会在下一帧生效。
      light.shadow.mapSize.set(state.mapSize, state.mapSize);
      if (light.shadow.map) {
        light.shadow.map.dispose();
        light.shadow.map = null;
      }
    }

    applyShadowCamera();
    applyMapSize();

    function frame(delta) {
      statue.rotation.y += delta * 0.3;
      sphere.rotation.y += delta * 0.2;
      renderer.render(scene, renderCamera);
      shadowCamHelper.update(); // 读取 shadow.camera 本帧更新后的 matrixWorld 与投影
      emitSnapshot({ state });
    }

    const loop = createRenderLoop(canvas, frame);
    const resizeObserver = createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      renderCamera.aspect = width / height;
      renderCamera.updateProjectionMatrix();
      loop.renderOnce();
    });

    return { state, loop, applyShadowCamera, applyMapSize };
  },

  apply(instance, args) {
    const { state, loop, applyShadowCamera, applyMapSize } = instance;
    if (state.mapSize !== args.mapSize) {
      state.mapSize = args.mapSize;
      applyMapSize();
    }
    if (state.range !== args.range) {
      state.range = args.range;
      applyShadowCamera();
    }
    loop.renderOnce();
  },

  readout({ state }) {
    // 正交阴影相机覆盖的世界宽度 = range * 2，纹素大小 = 世界宽度 / mapSize
    const worldWidth = state.range * 2;
    const texelSize = worldWidth / state.mapSize;
    return [
      ['shadow.mapSize', `${state.mapSize} × ${state.mapSize}`],
      ['shadow.camera 范围', `±${state.range}（覆盖 ${worldWidth}×${worldWidth}）`],
      ['阴影纹素大小', `${texelSize.toFixed(4)} 世界单位`],
      ['纹素密度', `${(1 / texelSize).toFixed(1)} tex / 单位`]
    ];
  }
};
