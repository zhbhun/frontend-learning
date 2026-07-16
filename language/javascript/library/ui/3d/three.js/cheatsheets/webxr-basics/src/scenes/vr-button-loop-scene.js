import { VRButton } from 'three/addons/webxr/VRButton.js';
import {
  createCamera,
  createRenderer,
  createWebXrPracticeWorld,
  disposeObjectTree,
  formatBoolean,
  formatSize,
  startAnimationLoop
} from '../shared-stage.js';
import { bindRange, mountEmbeddedButton, writeText } from '../shared-ui.js';
import { describeCapability, detectImmersiveVrSupport } from '../xr-capability.js';

/*
 * 本示例演示 three.js 接入 VR 的最小组合：renderer.xr.enabled、VRButton、setAnimationLoop。
 * 阅读主线：看 renderer.xr.enabled = true，再看 VRButton.createButton(renderer)，最后看 startAnimationLoop()。
 * 页面控件对应：旋转速度只影响普通场景动画；Session/帧来源读数来自 renderer.xr.isPresenting。
 * 预期观察：没有 WebXR 设备时按钮会停留在不可进入状态，但 setAnimationLoop 仍驱动普通 WebGL fallback。
 */
export function createVrButtonLoopLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const { scene, animated } = createWebXrPracticeWorld();
  const state = {
    speed: 1,
    supportText: '检测中'
  };

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');

  const button = VRButton.createButton(renderer);
  mountEmbeddedButton('xr-button-slot', button);
  writeText('xr-enabled-state', formatBoolean(renderer.xr.enabled));

  bindRange('speed-input', 'speed-output', (value) => value.toFixed(2), (value) => {
    state.speed = value;
  });

  detectImmersiveVrSupport().then((result) => {
    state.supportText = describeCapability(result);
  });

  const stop = startAnimationLoop(renderer, scene, camera, canvas, ({ delta, frameCount, isPresenting }) => {
    animated.rotation.y += delta * state.speed;
    animated.rotation.x = Math.sin(frameCount * 0.014) * 0.08;

    writeText('presenting-state', isPresenting ? 'XR session 运行中' : state.supportText);
    writeText('loop-source-state', isPresenting ? 'XR runtime' : '普通 canvas');
    writeText('frame-state', String(frameCount));
    writeText('size-state', formatSize(renderer));
  });

  window.addEventListener('beforeunload', () => {
    stop();
    disposeObjectTree(scene);
    renderer.dispose();
  });
}
