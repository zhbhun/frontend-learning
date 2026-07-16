import * as THREE from 'three';
import {
  createCamera,
  createRenderer,
  createWebXrPracticeWorld,
  disposeObjectTree,
  formatBoolean,
  startAnimationLoop,
  setPickState
} from '../shared-stage.js';
import { bindButton, writeText } from '../shared-ui.js';
import { describeCapability, detectImmersiveVrSupport } from '../xr-capability.js';

/*
 * 本示例演示 WebXR session 前置检测：secure context、navigator.xr、immersive-vr。
 * 阅读主线：先看 runCheck() 如何调用 navigator.xr.isSessionSupported('immersive-vr')，
 * 再看 applyCheckResult() 如何把结果同步到 DOM 和三个 3D 检测柱。
 * 页面控件对应：重新检测会再次读取当前浏览器能力；三根柱子分别代表三道门槛。
 * 预期观察：即使 WebXR 不可用，普通 WebGL 场景仍会渲染并显示 fallback 状态。
 */
export function createSessionCheckLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const { scene, animated } = createWebXrPracticeWorld();
  const gates = createCapabilityGates();

  scene.add(gates.group);

  async function runCheck() {
    writeText('secure-state', '检测中');
    writeText('navigator-state', '检测中');
    writeText('session-state', '检测中');

    const result = await detectImmersiveVrSupport();
    applyCheckResult(result, gates);
  }

  bindButton('check-again', runCheck);

  const stop = startAnimationLoop(renderer, scene, camera, canvas, ({ elapsed }) => {
    animated.rotation.y = Math.sin(elapsed * 0.6) * 0.22;
    gates.group.children.forEach((gate, index) => {
      gate.position.y = -0.7 + Math.sin(elapsed * 1.5 + index) * 0.045;
    });
  });

  runCheck();

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}

function createCapabilityGates() {
  const group = new THREE.Group();
  group.name = 'WebXR 检测柱';
  group.position.set(0, 0.25, -1.55);

  const gateData = [
    ['secure', -1.1],
    ['navigator', 0],
    ['session', 1.1]
  ];

  const meshes = new Map();

  gateData.forEach(([name, x]) => {
    const mesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.82, 8, 18),
      new THREE.MeshStandardMaterial({
        color: '#94a3b8',
        roughness: 0.5,
        metalness: 0.05
      })
    );
    mesh.name = name;
    mesh.position.x = x;
    mesh.userData.baseColor = new THREE.Color('#94a3b8');
    group.add(mesh);
    meshes.set(name, mesh);
  });

  return { group, meshes };
}

function applyCheckResult(result, gates) {
  const gateStates = {
    secure: result.secureContext,
    navigator: result.hasNavigatorXr,
    session: result.immersiveVrSupported
  };

  writeText('secure-state', formatBoolean(result.secureContext));
  writeText('navigator-state', formatBoolean(result.hasNavigatorXr));
  writeText('session-state', result.errorName || formatBoolean(result.immersiveVrSupported));
  writeText('fallback-state', describeCapability(result));

  gates.meshes.forEach((mesh, name) => {
    mesh.userData.baseColor.set(gateStates[name] ? '#36a269' : '#d6832b');
    setPickState(mesh, gateStates[name] ? 'hover' : 'idle');
  });
}
