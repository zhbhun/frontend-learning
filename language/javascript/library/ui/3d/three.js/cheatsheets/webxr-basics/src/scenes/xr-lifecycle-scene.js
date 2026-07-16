import { VRButton } from 'three/addons/webxr/VRButton.js';
import {
  createCamera,
  createRenderer,
  createWebXrPracticeWorld,
  disposeObjectTree,
  formatSize,
  startAnimationLoop
} from '../shared-stage.js';
import { bindButton, mountEmbeddedButton, setButtonsDisabled, writeText } from '../shared-ui.js';

/*
 * 本示例演示 WebXR 的生命周期心智模型：创建 renderer，安装 setAnimationLoop，
 * 进入/退出 session，暂停普通 loop，最后 dispose 自己拥有的资源。
 * 阅读主线：看 installLoop()/pauseLoop()/disposeAll()，再看 sessionstart/sessionend 如何更新状态。
 * 页面控件对应：模拟进入/退出只改状态，不需要 XR 设备；VRButton 可在支持设备上触发真实 session。
 * 预期观察：进入 XR 后尺寸来源显示 XR runtime；退出后回到页面容器；释放后按钮禁用。
 */
export function createXrLifecycleLesson(canvas) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const { scene, animated } = createWebXrPracticeWorld();
  const state = {
    disposed: false,
    simulatedPresenting: false,
    loopInstalled: false
  };

  renderer.xr.enabled = true;
  renderer.xr.setReferenceSpaceType('local-floor');
  mountEmbeddedButton('xr-button-slot', VRButton.createButton(renderer));

  renderer.xr.addEventListener('sessionstart', () => {
    state.simulatedPresenting = false;
    writeText('lifecycle-state', '真实 sessionstart');
  });

  renderer.xr.addEventListener('sessionend', () => {
    writeText('lifecycle-state', '真实 sessionend');
  });

  bindButton('simulate-enter', () => {
    if (state.disposed) {
      return;
    }
    state.simulatedPresenting = true;
    writeText('lifecycle-state', '模拟 sessionstart');
  });

  bindButton('simulate-exit', () => {
    if (state.disposed) {
      return;
    }
    state.simulatedPresenting = false;
    writeText('lifecycle-state', '模拟 sessionend');
  });

  bindButton('pause-loop', () => {
    if (state.disposed) {
      return;
    }
    if (renderer.xr.isPresenting) {
      writeText('loop-state', 'XR session 中不暂停普通循环');
      return;
    }
    pauseLoop();
  });

  bindButton('resume-loop', () => {
    if (!state.disposed) {
      installLoop();
    }
  });

  bindButton('dispose-scene', disposeAll);

  let stopLoop = () => {};

  function installLoop() {
    if (state.loopInstalled) {
      return;
    }

    stopLoop = startAnimationLoop(renderer, scene, camera, canvas, ({ delta, isPresenting }) => {
      animated.rotation.y += delta * 0.72;
      updateLifecycleReadout(isPresenting);
    });
    state.loopInstalled = true;
    writeText('loop-state', '运行中');
  }

  function pauseLoop() {
    stopLoop();
    state.loopInstalled = false;
    writeText('loop-state', '已暂停');
  }

  function disposeAll() {
    if (state.disposed) {
      return;
    }

    pauseLoop();
    state.disposed = true;
    disposeObjectTree(scene);
    renderer.dispose();
    setButtonsDisabled(['simulate-enter', 'simulate-exit', 'pause-loop', 'resume-loop', 'dispose-scene'], true);
    writeText('lifecycle-state', '已 dispose');
    writeText('session-state', '无');
    writeText('size-owner-state', '已停止');
    writeText('resource-state', '已释放 geometry/material/renderer');
  }

  function updateLifecycleReadout(isRealPresenting) {
    const isPresenting = isRealPresenting || state.simulatedPresenting;
    writeText('session-state', isPresenting ? '运行中' : '无');
    writeText('size-owner-state', isPresenting ? 'XR runtime' : `页面容器 / ${formatSize(renderer)}`);
    writeText('resource-state', 'geometry/material/renderer 持有中');
  }

  installLoop();

  window.addEventListener('beforeunload', () => {
    if (!state.disposed) {
      pauseLoop();
      disposeObjectTree(scene);
      renderer.dispose();
    }
  });
}
