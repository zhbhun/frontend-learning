/*
本范例对照“持续循环”与“按需渲染”：前者每帧推进并 render，后者只在参数变化时画一次。
输入是 mode 与 angle；主要操作是切换渲染模式，或在按需模式下拖动角度。
预期结果：持续模式下 render 计数持续增长、物体自转；按需模式下 loop 停止，只有改角度才增加计数。
读代码先看 apply() 里对 setAnimationLoop 的启停，再看 frame() 与 renderOnce()。
*/

import * as THREE from 'three';

export const onDemandRenderExample = {
  create(canvas, emitSnapshot) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#eef3f1');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(2.2, 1.4, 3.8);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const material = new THREE.MeshNormalMaterial({ flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const timer = new THREE.Timer();

    const state = {
      mode: 'continuous',
      nearViewport: false,
      loopRunning: false,
      renderCount: 0,
      lastDelta: 0,
      lastAngle: null,
      cube
    };

    function publish() {
      emitSnapshot({
        mode: state.mode,
        loopRunning: state.loopRunning,
        renderCount: state.renderCount,
        lastDelta: state.lastDelta,
        angle: cube.rotation.y
      });
    }

    function renderOnce(delta = 0) {
      state.lastDelta = delta;
      state.renderCount += 1;
      renderer.render(scene, camera);
      publish();
    }

    function frame(time) {
      timer.update(time);
      const delta = timer.getDelta();
      // 持续模式：用秒制速度自转，证明 loop 在推进业务状态。
      cube.rotation.y += 0.8 * delta;
      cube.rotation.x += 0.25 * delta;
      renderOnce(delta);
    }

    function startLoop() {
      if (state.loopRunning || !state.nearViewport || state.mode !== 'continuous') {
        return;
      }
      state.loopRunning = true;
      timer.reset();
      renderer.setAnimationLoop(frame);
    }

    function stopLoop() {
      if (!state.loopRunning) {
        return;
      }
      state.loopRunning = false;
      renderer.setAnimationLoop(null);
    }

    function resize() {
      const parent = canvas.parentElement;
      const width = Math.max(1, Math.floor(parent.clientWidth));
      const height = Math.max(1, Math.floor(parent.clientHeight));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      // 尺寸变化也要画一帧，否则按需模式下画面会空白或停在旧 buffer。
      renderOnce(0);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        state.nearViewport = entries[entries.length - 1].isIntersecting;
        if (state.nearViewport && state.mode === 'continuous') {
          startLoop();
        } else {
          stopLoop();
        }
      },
      { rootMargin: '200px 0px' }
    );
    visibilityObserver.observe(canvas);

    resize();

    return {
      state,
      startLoop,
      stopLoop,
      renderOnce,
      dispose() {
        stopLoop();
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        timer.dispose();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    const nextMode = args.mode;
    const modeChanged = instance.state.mode !== nextMode;
    const angleChanged = instance.state.lastAngle !== args.angle;
    instance.state.mode = nextMode;
    instance.state.lastAngle = args.angle;

    if (nextMode === 'continuous') {
      if (modeChanged || !instance.state.loopRunning) {
        instance.startLoop();
      }
      return;
    }

    // 按需：停掉持续循环，只在模式切入或角度变化时写 rotation 并 render。
    instance.stopLoop();
    if (!modeChanged && !angleChanged) {
      return;
    }
    instance.state.cube.rotation.y = args.angle;
    instance.state.cube.rotation.x = args.angle * 0.35;
    instance.renderOnce(0);
  },

  readout(snapshot) {
    return [
      ['渲染模式', snapshot.mode === 'continuous' ? '持续循环' : '按需渲染'],
      ['setAnimationLoop', snapshot.loopRunning ? '运行中' : '已停止（null）'],
      ['累计 render 次数', String(snapshot.renderCount)],
      ['本帧 delta', `${(snapshot.lastDelta * 1000).toFixed(1)} ms`],
      ['Y 轴角度', `${THREE.MathUtils.radToDeg(snapshot.angle).toFixed(1)}°`]
    ];
  }
};
