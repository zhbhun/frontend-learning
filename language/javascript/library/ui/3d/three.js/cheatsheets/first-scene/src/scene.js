import * as THREE from 'three';

export function createFirstScene(canvas, onFrame) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor('#eef2f3', 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#eef2f3');

  const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
  camera.position.set(0, 20, 20);
  camera.lookAt(0, 0, 0);

  const geometry = new THREE.BoxGeometry(2, 1, 1);
  const material = new THREE.MeshNormalMaterial({
    flatShading: true
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  const axes = new THREE.AxesHelper(2.4);
  scene.add(axes);

  const grid = new THREE.GridHelper(4, 4, '#9db2bd', '#d2dce1');
  grid.position.y = -1;
  scene.add(grid);

  const state = {
    running: true,
    speed: 1,
    frame: 0,
    animationId: 0,
    lastTime: 0
  };

  function resize() {
    const parent = canvas.parentElement;
    const width = Math.max(1, Math.floor(parent.clientWidth));
    const height = Math.max(1, Math.floor(parent.clientHeight));

    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    if (state.running) {
      cube.rotation.x += delta * state.speed * 0.45;
      cube.rotation.y += delta * state.speed * 0.9;
    }

    renderer.render(scene, camera);
    state.frame += 1;
    onFrame?.({ frame: state.frame, running: state.running });
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();
  window.addEventListener('resize', resize);

  return {
    setWireframe(enabled) {
      material.wireframe = enabled;
    },
    setRunning(running) {
      state.running = running;
    },
    setSpeed(speed) {
      state.speed = speed;
    },
    setCameraDistance(distance) {
      camera.position.z = distance;
      camera.lookAt(0, 0, 0);
    },
    reset() {
      cube.rotation.set(0, 0, 0);
      state.frame = 0;
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    }
  };
}
