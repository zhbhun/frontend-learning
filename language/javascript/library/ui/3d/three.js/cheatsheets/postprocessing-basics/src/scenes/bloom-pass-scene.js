/*
 * 本示例演示什么：
 * 用 UnrealBloomPass 从画面中提取亮区，并用 threshold、strength、radius 控制发光范围和强度。
 * 读代码先看哪里：
 * 先看 bloomPass 的构造参数和 composer.addPass 顺序，再看 bindRange 如何直接写回 bloomPass。
 * 控件对应哪些 API：
 * threshold -> bloomPass.threshold；strength -> bloomPass.strength；radius -> bloomPass.radius。
 * 预期观察什么：
 * threshold 越低越多区域参与发光；strength 越高光晕越亮；radius 越高光晕扩散越宽。
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  createBaseScene,
  createCamera,
  createControls,
  createFloor,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  formatSize,
  passNames,
  startFrameLoop
} from '../shared-stage.js';
import { bindRange, writeText } from '../shared-ui.js';

export function createBloomPassLesson(canvas) {
  const renderer = createRenderer(canvas, { clearColor: '#09111d' });
  renderer.toneMappingExposure = 0.92;

  const camera = createCamera();
  const controls = createControls(camera, canvas);
  const { scene } = createBaseScene('#09111d');
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.15, 0.34, 0.75);
  const outputPass = new OutputPass();
  const brightGroup = createBrightObjects();

  scene.add(createFloor(), brightGroup);

  composer.addPass(renderPass);
  // Bloom 读取 RenderPass 的结果，提取超过 threshold 的亮区，再把模糊后的结果叠回输入画面。
  composer.addPass(bloomPass);
  composer.addPass(outputPass);

  function writeState(size) {
    writeText('chain-state', passNames(composer));
    writeText(
      'bloom-state',
      `threshold=${formatNumber(bloomPass.threshold)}; strength=${formatNumber(bloomPass.strength)}; radius=${formatNumber(bloomPass.radius)}`
    );
    writeText('bright-state', '中心使用高亮 MeshBasicMaterial，旁边普通材质帮助判断 threshold');
    writeText('size-state', size ? formatSize(size) : '-');
  }

  bindRange('threshold', (value) => {
    bloomPass.threshold = value;
    writeState();
  });
  bindRange('strength', (value) => {
    bloomPass.strength = value;
    writeState();
  });
  bindRange('radius', (value) => {
    bloomPass.radius = value;
    writeState();
  });

  const stop = startFrameLoop({
    renderer,
    camera,
    composer,
    canvas,
    controls,
    onFrame(elapsed, size) {
      brightGroup.rotation.y = elapsed * 0.18;
      brightGroup.children[0].rotation.y = elapsed * 0.8;
      brightGroup.children[1].rotation.x = elapsed * 0.55;
      writeState(size);
    }
  });

  window.addEventListener('beforeunload', () => {
    stop();
    bloomPass.dispose();
    outputPass.dispose();
    composer.dispose();
    controls.dispose();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createBrightObjects() {
  const group = new THREE.Group();
  const glowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(2.6, 1.35, 0.28)
  });
  const coolGlowMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color(0.35, 1.3, 2.8)
  });

  const ring = new THREE.Mesh(new THREE.TorusKnotGeometry(0.58, 0.15, 120, 16), glowMaterial);
  ring.name = '高亮圆环';
  ring.position.set(-0.9, -0.18, 0.08);

  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.54, 1), coolGlowMaterial);
  core.name = '高亮核心';
  core.position.set(0.72, -0.1, 0.05);

  const reference = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 32, 16),
    new THREE.MeshStandardMaterial({ color: '#cfd8dc', roughness: 0.45, metalness: 0.18 })
  );
  reference.name = '普通亮度参照';
  reference.position.set(0.1, -0.8, 1.05);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 1.6, 0.08, 72),
    new THREE.MeshStandardMaterial({ color: '#223244', roughness: 0.8, metalness: 0.05 })
  );
  base.position.y = -1;

  group.add(ring, core, reference, base);
  return group;
}
