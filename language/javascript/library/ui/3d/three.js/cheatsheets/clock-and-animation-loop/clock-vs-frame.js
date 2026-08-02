/*
本范例对比"按帧数推进"与"按时间（Timer）推进"在同一模拟帧率下的差异。
输入是 running 与 simulatedFps；主要操作是把 setAnimationLoop 的回调按目标帧率节流，
分别用"每帧固定增量"和"Timer.update(time) + getDelta()"推进两个立方体。
预期结果：模拟帧率降低时，帧推进立方体的角速度随之下降；Timer 推进立方体的角速度保持稳定。
读代码先看 frame() 的节流逻辑，再对照两个立方体的更新语句。
*/

import * as THREE from 'three';

export const clockVsFrameExample = {
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
    camera.position.set(0, 0.3, 5.2);
    camera.lookAt(0, 0, 0);

    const geometry = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const frameMaterial = new THREE.MeshNormalMaterial({ flatShading: true });
    const timerMaterial = new THREE.MeshNormalMaterial({ flatShading: true });

    const frameCube = new THREE.Mesh(geometry, frameMaterial);
    const timerCube = new THREE.Mesh(geometry, timerMaterial);
    frameCube.position.x = -1.6;
    timerCube.position.x = 1.6;
    scene.add(frameCube, timerCube);

    // Timer 是 r183 起取代 Clock 的推荐 API；update(time) 用 setAnimationLoop 的时间戳推进内部状态。
    const timer = new THREE.Timer();

    // 60fps 下两种方式速度对齐：60 * 0.018 = 1.08 弧度/秒。
    const perFrameStep = 0.018;
    const angularSpeed = 1.08;

    const state = {
      requestedRunning: true,
      nearViewport: false,
      loopRunning: false,
      simulatedFps: 60,
      lastStepTime: 0,
      lastDelta: 0,
      // 滑动窗口测量实际步进率与派生角速度，让读数稳定可读。
      stepCount: 0,
      windowStart: 0,
      measuredFps: 0,
      frameAngleMark: 0,
      timerAngleMark: 0,
      frameAngularVelocity: 0,
      timerAngularVelocity: 0
    };

    function publishSnapshot() {
      emitSnapshot({
        simulatedFps: state.simulatedFps,
        measuredFps: state.measuredFps,
        lastDelta: state.lastDelta,
        elapsed: timer.getElapsed(),
        frameAngle: frameCube.rotation.y,
        timerAngle: timerCube.rotation.y,
        frameAngularVelocity: state.frameAngularVelocity,
        timerAngularVelocity: state.timerAngularVelocity
      });
    }

    function draw() {
      renderer.render(scene, camera);
      publishSnapshot();
    }

    function frame(time) {
      if (!state.requestedRunning) return;

      // 用目标帧率节流回调，模拟"设备只有这个刷新率"。
      const targetInterval = 1000 / state.simulatedFps;
      if (state.lastStepTime && time - state.lastStepTime < targetInterval) {
        return;
      }

      // 把 setAnimationLoop 的毫秒时间戳交给 Timer.update()，再查询秒制 delta。
      timer.update(time);
      const delta = timer.getDelta();
      state.lastDelta = delta;
      state.lastStepTime = time;

      // 帧推进：每次步进固定加，速度与步进频率耦合。
      frameCube.rotation.y += perFrameStep;
      // Timer 推进：速度乘秒制 delta，与步进频率解耦。
      timerCube.rotation.y += angularSpeed * delta;

      // 每 500ms 计算一次实际步进率与派生角速度，避免读数抖动。
      state.stepCount += 1;
      if (!state.windowStart) {
        state.windowStart = time;
        state.frameAngleMark = frameCube.rotation.y;
        state.timerAngleMark = timerCube.rotation.y;
      } else if (time - state.windowStart >= 500) {
        const windowSec = (time - state.windowStart) / 1000;
        state.measuredFps = state.stepCount / windowSec;
        state.frameAngularVelocity =
          (frameCube.rotation.y - state.frameAngleMark) / windowSec;
        state.timerAngularVelocity =
          (timerCube.rotation.y - state.timerAngleMark) / windowSec;
        // 滑动窗口重置。
        state.stepCount = 0;
        state.windowStart = time;
        state.frameAngleMark = frameCube.rotation.y;
        state.timerAngleMark = timerCube.rotation.y;
      }

      draw();
    }

    function startLoop() {
      if (state.loopRunning || !state.nearViewport || !state.requestedRunning) {
        return;
      }
      state.loopRunning = true;
      state.lastStepTime = 0;
      state.lastDelta = 0;
      // 重置 Timer 时间基准，避免首帧 delta 包含场景创建以来的全部时间。
      timer.reset();
      renderer.setAnimationLoop(frame);
    }

    function stopLoop() {
      if (!state.loopRunning) {
        return;
      }
      state.loopRunning = false;
      state.lastStepTime = 0;
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
        timer.dispose();
        geometry.dispose();
        frameMaterial.dispose();
        timerMaterial.dispose();
        renderer.dispose();
      }
    };
  },

  apply(instance, args) {
    instance.state.simulatedFps = args.simulatedFps;
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
      ['模拟帧率', `${snapshot.simulatedFps} fps`],
      ['实际步进率', `${snapshot.measuredFps.toFixed(1)} fps`],
      ['Timer.getDelta()', `${(snapshot.lastDelta * 1000).toFixed(1)} ms`],
      ['Timer.getElapsed()', `${snapshot.elapsed.toFixed(2)} s`],
      ['帧推进 角度', `${THREE.MathUtils.radToDeg(snapshot.frameAngle).toFixed(1)}°`],
      ['Timer 推进 角度', `${THREE.MathUtils.radToDeg(snapshot.timerAngle).toFixed(1)}°`],
      ['帧推进 角速度', `${THREE.MathUtils.radToDeg(snapshot.frameAngularVelocity).toFixed(1)}°/s`],
      ['Timer 推进 角速度', `${THREE.MathUtils.radToDeg(snapshot.timerAngularVelocity).toFixed(1)}°/s`]
    ];
  },

  captions: ['帧推进（固定每帧）', 'Timer 推进（按时间）']
};
