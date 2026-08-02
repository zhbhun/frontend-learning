/*
按需渲染范例：对比 setAnimationLoop 连续渲染与事件驱动按需渲染的 render 次数差异。

输入是渲染模式（continuous / onDemand）和对象的 Y 旋转角度。
- continuous：renderer.setAnimationLoop 每帧 render，render/s 接近显示器刷新率。
- onDemand：停掉循环，仅在 apply 被调用（Controls 改动、resize）时 renderOnce；
  空闲时 render/s 归零，CPU 与 GPU 都不再为场景工作。

读文件时先看 frame() 与 startLoop/stopLoop 的切换，再看 trackRender() 怎样用
1s 滚动窗口算 render/s；refreshReadout() 定期推一次快照，让空闲时的读数也能反映 0。
*/

import * as THREE from 'three';

import {
  createRenderer,
  createResizeObserver,
  readCanvasSize
} from '../../assets/shared-scene.js';

const RENDER_TRACK_WINDOW = 1000; // 统计窗口：1 秒
const READOUT_REFRESH_MS = 250; // 空闲时也定期刷新读数，避免停留在旧值

export const onDemandExample = {
  create(canvas, emitSnapshot) {
    const renderer = createRenderer(canvas);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 50);
    camera.position.set(4, 3, 5);
    camera.lookAt(0, 0.85, 0);

    scene.add(new THREE.GridHelper(12, 12, '#8ba096', '#d3ded7'));
    scene.add(new THREE.AxesHelper(2));
    scene.add(new THREE.HemisphereLight('#ffffff', '#78908a', 0.8));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(4, 7, 5);
    scene.add(key);

    const material = new THREE.MeshStandardMaterial({
      color: '#3d73d9',
      roughness: 0.4,
      metalness: 0.1
    });
    const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 2), material);
    mesh.position.y = 0.85;
    scene.add(mesh);

    const state = {
      renderMode: 'continuous',
      rotationY: 0,
      totalRenders: 0
    };

    const renderTimestamps = []; // 滚动窗口：每次 render 推入 performance.now()
    let animationId = 0;

    function trackRender() {
      const now = performance.now();
      renderTimestamps.push(now);
      while (
        renderTimestamps.length > 0 &&
        now - renderTimestamps[0] > RENDER_TRACK_WINDOW
      ) {
        renderTimestamps.shift();
      }
      state.totalRenders++;
    }

    function renderFrame() {
      mesh.rotation.y = state.rotationY;
      renderer.render(scene, camera);
      trackRender();
      emitSnapshot({ renderer, state, renderTimestamps });
    }

    function loop() {
      // setAnimationLoop 调用：每帧 render。空闲页面（标签页隐藏）时 rAF 会被浏览器节流。
      renderFrame();
      animationId = window.requestAnimationFrame(loop);
    }

    function startLoop() {
      if (animationId !== 0) return;
      animationId = window.requestAnimationFrame(loop);
    }

    function stopLoop() {
      if (animationId === 0) return;
      window.cancelAnimationFrame(animationId);
      animationId = 0;
    }

    // 两种模式下都定期推一次快照：连续模式下其实每帧都推（这里只是兜底）；
    // 按需模式下空闲时不 render，没有快照就会停留在最后一次 render 的读数上，
    // 读不出"render/s 已经归零"这件事。这里每 250ms 推一次让 readout 持续刷新。
    const readoutTimer = window.setInterval(() => {
      emitSnapshot({ renderer, state, renderTimestamps });
    }, READOUT_REFRESH_MS);

    // 视口外彻底停止：避免滚动一页有 N 个动画在跑。
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[entries.length - 1];
        if (!entry.isIntersecting) {
          stopLoop();
        } else if (state.renderMode === 'continuous') {
          startLoop();
        }
      },
      { rootMargin: '200px 0px' }
    );
    visibilityObserver.observe(canvas);

    createResizeObserver(canvas, () => {
      const { width, height } = readCanvasSize(canvas);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderFrame(); // resize 是典型的"必须重画一次"事件
    });

    // 初始：先画一帧再启动循环
    renderFrame();
    startLoop();

    return {
      scene,
      renderer,
      state,
      renderTimestamps,
      renderFrame,
      startLoop,
      stopLoop,
      readoutTimer
    };
  },

  apply(instance, args) {
    const { state, renderFrame, startLoop, stopLoop } = instance;
    state.renderMode = args.renderMode;
    state.rotationY = args.rotationY;

    if (state.renderMode === 'continuous') {
      startLoop();
    } else {
      // 按需：停循环，立刻画一帧体现这次 args 的变化。
      stopLoop();
      renderFrame();
    }
  },

  readout({ renderer, state, renderTimestamps }) {
    const now = performance.now();
    while (
      renderTimestamps.length > 0 &&
      now - renderTimestamps[0] > RENDER_TRACK_WINDOW
    ) {
      renderTimestamps.shift();
    }
    const info = renderer.info;
    return [
      [
        '渲染模式',
        state.renderMode === 'continuous'
          ? 'setAnimationLoop（每帧 render）'
          : '事件驱动（仅变化时 render）'
      ],
      ['每秒 render 次数', renderTimestamps.length],
      ['累计 render 次数', state.totalRenders.toLocaleString()],
      ['本帧 draw calls', info.render.calls],
      ['本帧 triangles', info.render.triangles]
    ];
  }
};
