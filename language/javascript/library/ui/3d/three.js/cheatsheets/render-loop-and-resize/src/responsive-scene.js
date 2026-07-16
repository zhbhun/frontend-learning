import * as THREE from 'three';

export function createResponsiveScene(canvas, onMetrics) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f0e8');

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(2.6, 1.8, 5);
  camera.lookAt(0, 0, 0);

  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 1.4, 1.4),
    new THREE.MeshNormalMaterial({ flatShading: true })
  );
  scene.add(cube);

  const grid = new THREE.GridHelper(5, 5, '#87959d', '#d0d8db');
  grid.position.y = -1;
  scene.add(grid);

  const axes = new THREE.AxesHelper(2.5);
  scene.add(axes);

  const state = {
    resizeMode: 'correct',
    pixelRatio: 1,
    speed: 1,
    lastTime: 0,
    animationId: 0,
    cssWidth: 1,
    cssHeight: 1
  };

  renderer.setPixelRatio(state.pixelRatio);

  function readCssSize() {
    const parent = canvas.parentElement;
    return {
      width: Math.max(1, Math.floor(parent.clientWidth)),
      height: Math.max(1, Math.floor(parent.clientHeight))
    };
  }

  function applyCorrectResize(width, height) {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function applyWrongCameraResize(width, height) {
    renderer.setSize(width, height, false);
  }

  function resize() {
    const { width, height } = readCssSize();
    state.cssWidth = width;
    state.cssHeight = height;

    if (state.resizeMode === 'correct') {
      applyCorrectResize(width, height);
    }

    if (state.resizeMode === 'wrong-camera') {
      applyWrongCameraResize(width, height);
    }

    publishMetrics(0);
  }

  function publishMetrics(delta) {
    const buffer = renderer.getDrawingBufferSize(new THREE.Vector2());

    onMetrics?.({
      cssWidth: state.cssWidth,
      cssHeight: state.cssHeight,
      bufferWidth: Math.round(buffer.x),
      bufferHeight: Math.round(buffer.y),
      aspect: camera.aspect,
      delta,
      fps: delta > 0 ? 1 / delta : 0,
      strategy: state.resizeMode
    });
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    cube.rotation.x += delta * state.speed * 0.55;
    cube.rotation.y += delta * state.speed;

    renderer.render(scene, camera);
    publishMetrics(delta);
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();

  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);

  return {
    setResizeMode(mode) {
      state.resizeMode = mode;

      if (mode === 'correct') {
        resize();
      }

      if (mode === 'wrong-camera') {
        camera.aspect = 1;
        camera.updateProjectionMatrix();
        resize();
      }
    },
    setPixelRatio(pixelRatio) {
      state.pixelRatio = pixelRatio;
      renderer.setPixelRatio(pixelRatio);
      resize();
    },
    setSpeed(speed) {
      state.speed = speed;
    },
    resize,
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      cube.geometry.dispose();
      cube.material.dispose();
      renderer.dispose();
    }
  };
}
