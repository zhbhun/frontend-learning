import * as THREE from 'three';
import {
  createBaseScene,
  createCamera,
  createGround,
  createLitObject,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  startRenderLoop
} from '../shared-stage.js';
import { bindCheckbox, bindRange, writeText } from '../shared-ui.js';

/*
 * 示例介绍：
 * 这个文件只演示 DirectionalLight 的 shadow map 链路，不再比较不同 Light 类型。
 * 阅读主线：先看 renderer/light/mesh/ground 四个阴影开关，再看 shadow.camera 的范围和 bias。
 * 控件对应：页面复选框映射阴影链路开关，滑块映射光源位置、阴影相机范围和深度偏移。
 */
export function createShadowMapLesson(canvas) {
  const renderer = createRenderer(canvas, { shadows: true });
  const scene = createBaseScene();
  const camera = createCamera();
  const state = {
    rendererShadow: true,
    lightCast: true,
    meshCast: true,
    groundReceive: true,
    showHelper: true,
    lightX: -2.4,
    cameraSize: 5.2,
    bias: -0.001,
    normalBias: 0.018,
    radius: 2
  };

  const ambient = new THREE.HemisphereLight('#eef8ff', '#71604a', 0.45);
  const light = new THREE.DirectionalLight('#ffffff', 2.1);
  const target = new THREE.Object3D();
  const ground = createGround();
  const main = createLitObject('#2f83d8');
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshStandardMaterial({ color: '#d6832b', roughness: 0.55 })
  );
  const lightHelper = new THREE.DirectionalLightHelper(light, 0.55, '#f59e0b');
  const shadowHelper = new THREE.CameraHelper(light.shadow.camera);

  light.position.set(state.lightX, 4.2, 3.6);
  target.position.set(0, -0.15, 0);
  light.target = target;
  main.position.set(-0.6, 0.0, 0);
  block.position.set(0.9, -0.45, 0.55);

  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 12;

  scene.add(ambient, target, light, ground, main, block, lightHelper, shadowHelper);

  function applyShadowSettings() {
    // 阴影链路要四个开关同时成立；任意一处关闭都会让 shadow map 不参与最终画面。
    renderer.shadowMap.enabled = state.rendererShadow;
    renderer.shadowMap.needsUpdate = true;
    light.castShadow = state.lightCast;
    main.castShadow = state.meshCast;
    block.castShadow = state.meshCast;
    ground.receiveShadow = state.groundReceive;
    shadowHelper.visible = state.showHelper;

    light.position.x = state.lightX;
    light.shadow.bias = state.bias;
    light.shadow.normalBias = state.normalBias;
    light.shadow.radius = state.radius;

    const size = state.cameraSize;
    const shadowCamera = light.shadow.camera;
    // DirectionalLight 的阴影相机是正交相机；范围改变后必须更新投影矩阵和 helper。
    shadowCamera.left = -size;
    shadowCamera.right = size;
    shadowCamera.top = size;
    shadowCamera.bottom = -size;
    shadowCamera.updateProjectionMatrix();
    light.shadow.needsUpdate = true;
    lightHelper.update();
    shadowHelper.update();

    writeText('renderer-state', `shadowMap.enabled ${renderer.shadowMap.enabled}; type PCFShadowMap`);
    writeText('light-state', `castShadow ${light.castShadow}; x ${formatNumber(light.position.x)}`);
    writeText('caster-state', `main/block castShadow ${main.castShadow}`);
    writeText('receiver-state', `ground receiveShadow ${ground.receiveShadow}`);
    writeText('shadow-state', `size ${formatNumber(size)}; bias ${formatNumber(light.shadow.bias)}; normalBias ${formatNumber(light.shadow.normalBias)}; radius ${formatNumber(light.shadow.radius)}`);
  }

  bindRange('light-x', 'light-x-value', formatNumber, (value) => {
    state.lightX = value;
    applyShadowSettings();
  });
  bindRange('camera-size', 'camera-size-value', formatNumber, (value) => {
    state.cameraSize = value;
    applyShadowSettings();
  });
  bindRange('bias', 'bias-value', formatNumber, (value) => {
    state.bias = value;
    applyShadowSettings();
  });
  bindRange('normal-bias', 'normal-bias-value', formatNumber, (value) => {
    state.normalBias = value;
    applyShadowSettings();
  });
  bindRange('radius', 'radius-value', formatNumber, (value) => {
    state.radius = value;
    applyShadowSettings();
  });
  bindCheckbox('renderer-shadow', (checked) => {
    state.rendererShadow = checked;
    applyShadowSettings();
  });
  bindCheckbox('light-cast', (checked) => {
    state.lightCast = checked;
    applyShadowSettings();
  });
  bindCheckbox('mesh-cast', (checked) => {
    state.meshCast = checked;
    applyShadowSettings();
  });
  bindCheckbox('ground-receive', (checked) => {
    state.groundReceive = checked;
    applyShadowSettings();
  });
  bindCheckbox('show-helper', (checked) => {
    state.showHelper = checked;
    applyShadowSettings();
  });

  const stop = startRenderLoop(renderer, scene, camera, canvas, (time) => {
    main.rotation.set(0.32, time * 0.42, 0.08);
    block.rotation.y = -time * 0.55;
    lightHelper.update();
    shadowHelper.update();
  });

  return {
    dispose() {
      stop();
      light.shadow.dispose();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}
