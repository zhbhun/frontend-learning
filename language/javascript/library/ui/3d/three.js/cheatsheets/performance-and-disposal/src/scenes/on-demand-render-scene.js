/*
本示例演示按需渲染、连续渲染和页面暂停策略如何协作。
读代码先看 requestRender() 和 syncLoop()：所有控件、尺寸、可见性变化都先进入统一调度入口。
控件对应 API：连续渲染 -> requestAnimationFrame 循环；请求一帧 -> requestRender()；Page Visibility / IntersectionObserver -> 暂停条件。
预期观察：按需模式只有控件变化或点击按钮才增加 frames；页面隐藏或 canvas 离开视口时连续循环会暂停。
*/

import * as THREE from 'three';
import {
  addBaseLights,
  createBaseScene,
  createCamera,
  createRenderer,
  disposeObjectTree,
  formatNumber,
  readRendererInfo,
  resizeRendererAndCamera
} from '../shared-stage.js';

const initialState = {
  continuous: false,
  rotationDegrees: 0,
  frameCount: 0,
  lastReason: '初始化',
  inViewport: true,
  visible: document.visibilityState !== 'hidden'
};

export function createOnDemandRenderScene(canvas, onSnapshot) {
  const renderer = createRenderer(canvas);
  const camera = createCamera();
  const scene = createBaseScene();
  const state = { ...initialState };
  const mesh = createHeroMesh();
  let pendingFrame = 0;
  let loopFrame = 0;
  let lastInfo = readRendererInfo(renderer);

  addBaseLights(scene);
  scene.add(mesh);

  const resizeObserver = 'ResizeObserver' in window
    ? new ResizeObserver(() => requestRender('ResizeObserver'))
    : null;
  resizeObserver?.observe(canvas.parentElement);

  const intersectionObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(([entry]) => {
        state.inViewport = entry?.isIntersecting ?? true;
        state.lastReason = state.inViewport ? 'IntersectionObserver: 进入视口' : 'IntersectionObserver: 离开视口';
        syncLoop();
        if (state.inViewport) {
          requestRender(state.lastReason);
        } else {
          publishSnapshot();
        }
      })
    : null;
  intersectionObserver?.observe(canvas.parentElement);

  window.addEventListener('resize', handleWindowResize);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  requestRender('初始化');

  function requestRender(reason = '请求一帧') {
    state.lastReason = reason;

    if (!isRenderable() || state.continuous || pendingFrame) {
      publishSnapshot();
      return;
    }

    pendingFrame = requestAnimationFrame((time) => {
      pendingFrame = 0;
      renderFrame(time, false);
    });
  }

  function syncLoop() {
    if (state.continuous && isRenderable()) {
      startLoop();
      return;
    }

    stopLoop();
  }

  function startLoop() {
    if (loopFrame) {
      return;
    }

    function loop(time) {
      if (!state.continuous || !isRenderable()) {
        loopFrame = 0;
        publishSnapshot();
        return;
      }

      renderFrame(time, true);
      loopFrame = requestAnimationFrame(loop);
    }

    loopFrame = requestAnimationFrame(loop);
  }

  function stopLoop() {
    if (loopFrame) {
      cancelAnimationFrame(loopFrame);
      loopFrame = 0;
    }
  }

  function renderFrame(time, animated) {
    resizeRendererAndCamera(renderer, camera, canvas);

    if (animated) {
      mesh.rotation.y = time * 0.0011;
    } else {
      mesh.rotation.y = THREE.MathUtils.degToRad(state.rotationDegrees);
    }

    renderer.render(scene, camera);
    lastInfo = readRendererInfo(renderer);
    state.frameCount += 1;
    publishSnapshot();
  }

  function handleVisibilityChange() {
    state.visible = document.visibilityState !== 'hidden';
    state.lastReason = state.visible ? 'Page Visibility: visible' : 'Page Visibility: hidden';
    syncLoop();

    if (state.visible) {
      requestRender(state.lastReason);
    } else {
      publishSnapshot();
    }
  }

  function handleWindowResize() {
    requestRender('window resize');
  }

  function isRenderable() {
    return state.visible && state.inViewport;
  }

  function publishSnapshot() {
    onSnapshot?.({
      ...lastInfo,
      frames: state.frameCount,
      mode: state.continuous ? (loopFrame ? '连续渲染中' : '连续渲染已暂停') : '按需渲染',
      visibility: state.visible ? 'visible' : 'hidden',
      intersection: state.inViewport ? 'in view' : 'out of view',
      reason: state.lastReason
    });
  }

  return {
    setContinuous(value) {
      state.continuous = value;
      state.lastReason = value ? '开启连续渲染' : '切到按需渲染';
      syncLoop();

      if (!value) {
        requestRender(state.lastReason);
      }
    },
    setRotation(value) {
      state.rotationDegrees = value;
      requestRender('控件改变 rotation');
    },
    requestFrame() {
      requestRender('手动请求一帧');
    },
    dispose() {
      if (pendingFrame) {
        cancelAnimationFrame(pendingFrame);
      }
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disposeObjectTree(scene);
      renderer.dispose();
    }
  };
}

function createHeroMesh() {
  const geometry = new THREE.TorusKnotGeometry(0.72, 0.22, 96, 14);
  const material = new THREE.MeshStandardMaterial({
    color: '#2f83d8',
    roughness: 0.42,
    metalness: 0.16
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.15;
  return mesh;
}

export function formatOnDemandSnapshot(snapshot) {
  return {
    frames: formatNumber(snapshot.frames),
    mode: snapshot.mode,
    visibility: snapshot.visibility,
    intersection: snapshot.intersection,
    calls: formatNumber(snapshot.calls),
    reason: snapshot.reason
  };
}
