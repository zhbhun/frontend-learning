/*
本范例演示第一幅 three.js 画面的最小协作关系。
输入是 running 与 angularSpeed；主要操作是创建 renderer、scene、camera、geometry、material、mesh，
再由 WebGLRenderer.setAnimationLoop() 按秒更新旋转并渲染。
预期结果是彩色立方体持续旋转；暂停后角度与画面保持不变，恢复时不会补算暂停期间的时间。
读代码先看 create() 中的对象创建顺序，再看 startLoop()、stopLoop() 和 apply()。
*/

import * as THREE from 'three';

const background = '#eef3f1';

export const firstSceneExample = {
  create(canvas, emitSnapshot) {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(background, 1);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(background);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.z = 3;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial({ flatShading: true });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const state = {
      angularSpeed: 0.8,
      requestedRunning: true,
      nearViewport: false,
      loopRunning: false,
      frameCount: 0,
      lastTime: 0
    };

    function publishSnapshot() {
      emitSnapshot({
        status: state.requestedRunning ? '旋转中' : '已暂停',
        angle: THREE.MathUtils.radToDeg(cube.rotation.y),
        frameCount: state.frameCount
      });
    }

    function draw(delta = 0) {
      if (state.requestedRunning) {
        cube.rotation.x += delta * state.angularSpeed * 0.55;
        cube.rotation.y += delta * state.angularSpeed;
      }

      renderer.render(scene, camera);
      state.frameCount += 1;
      publishSnapshot();
    }

    function frame(time) {
      // 恢复循环时首帧 delta 取 0，避免把离屏或暂停时间一次性补进角度。
      const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
      state.lastTime = time;
      draw(delta);
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
      cube,
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
      ['Y 轴角度', `${snapshot.angle.toFixed(1)}°`],
      ['已渲染帧', snapshot.frameCount]
    ];
  }
};
