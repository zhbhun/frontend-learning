/*
本范例演示如何用帧间 delta 表达“每秒角速度”，并安全地暂停、恢复渲染循环。
输入是 running 与 angularSpeed；主要操作是用 setAnimationLoop() 的毫秒时间戳计算秒制 delta，
再执行 rotation += angularSpeed * delta。
预期结果是帧间隔会波动，但角速度仍按每秒弧度解释；暂停或离屏后保留最后一帧，恢复首帧 delta 为 0。
读代码先看 frame() 的时间换算，再看 startLoop() / stopLoop() 的生命周期。
*/

import * as THREE from 'three';

export const animationLoopExample = {
  create(canvas, emitSnapshot) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#edf3ef');

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(2.4, 1.6, 4.2);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry(1.25, 1.25, 1.25);
    const material = new THREE.MeshNormalMaterial({ flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const state = {
      angularSpeed: 1,
      requestedRunning: true,
      nearViewport: false,
      loopRunning: false,
      lastTime: 0,
      lastDelta: 0,
      elapsed: 0
    };

    function draw(delta = 0) {
      if (state.requestedRunning) {
        // angularSpeed 的单位是弧度/秒；delta 的单位是秒。
        cube.rotation.y += state.angularSpeed * delta;
        cube.rotation.x += state.angularSpeed * delta * 0.35;
        state.elapsed += delta;
      }

      renderer.render(scene, camera);
      emitSnapshot({
        status: state.requestedRunning ? '运行中' : '已暂停',
        delta: state.lastDelta,
        elapsed: state.elapsed,
        angle: cube.rotation.y
      });
    }

    function frame(time) {
      const rawDelta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
      state.lastTime = time;

      // 页面短暂卡顿时限制单帧步长，避免对象突然跨过很远距离。
      state.lastDelta = Math.min(rawDelta, 0.1);
      draw(state.lastDelta);
    }

    function startLoop() {
      if (state.loopRunning || !state.nearViewport || !state.requestedRunning) {
        return;
      }

      state.loopRunning = true;
      state.lastTime = 0;
      renderer.setAnimationLoop(frame);
    }

    function stopLoop() {
      if (!state.loopRunning) {
        return;
      }

      state.loopRunning = false;
      state.lastTime = 0;
      state.lastDelta = 0;
      renderer.setAnimationLoop(null);
    }

    function resize() {
      const parent = canvas.parentElement;
      const width = Math.max(1, Math.floor(parent.clientWidth));
      const height = Math.max(1, Math.floor(parent.clientHeight));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas.parentElement);

    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        state.nearViewport = entries[entries.length - 1].isIntersecting;

        if (state.nearViewport) {
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
      draw,
      startLoop,
      stopLoop,
      dispose() {
        stopLoop();
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.state.angularSpeed = args.angularSpeed;
    instance.state.requestedRunning = args.running;

    if (args.running) {
      instance.startLoop();
    } else {
      instance.stopLoop();
      instance.draw();
    }
  },

  readout(snapshot) {
    return [
      ['状态', snapshot.status],
      ['本帧 delta', `${(snapshot.delta * 1000).toFixed(1)} ms`],
      ['累计运行时间', `${snapshot.elapsed.toFixed(2)} s`],
      ['Y 轴角度', `${THREE.MathUtils.radToDeg(snapshot.angle).toFixed(1)}°`]
    ];
  }
};
