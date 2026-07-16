import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../shared-scene.js';

const initialState = {
  viewHeight: 5.5,
  zoom: 1,
  near: 0.1,
  far: 40,
  distance: 8,
  lastTime: 0,
  animationId: 0
};

export function createOrthographicScene(canvas, onSnapshot) {
  const state = { ...initialState };
  const renderer = createRenderer(canvas);
  const world = createCameraTargetScene();

  // 正交相机用 left/right/top/bottom 定义观察盒；远近不会改变物体屏幕大小。
  const camera = new THREE.OrthographicCamera(-3, 3, 3, -3, state.near, state.far);
  placeCamera(camera, state.distance);

  function updateProjection(width, height) {
    const aspect = width / height;
    const halfHeight = state.viewHeight / 2;
    const halfWidth = halfHeight * aspect;

    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight;
    camera.bottom = -halfHeight;
    camera.near = state.near;
    camera.far = state.far;
    camera.zoom = state.zoom;
    camera.updateProjectionMatrix();
  }

  function publishSnapshot() {
    const visibleWidth = (camera.right - camera.left) / camera.zoom;
    const visibleHeight = (camera.top - camera.bottom) / camera.zoom;

    onSnapshot?.({
      viewHeight: state.viewHeight,
      zoom: camera.zoom,
      near: camera.near,
      far: camera.far,
      distance: state.distance,
      boxText: `${visibleWidth.toFixed(2)} x ${visibleHeight.toFixed(2)}`,
      positionText: formatVector(camera.position)
    });
  }

  function resize() {
    const { width, height } = readCanvasSize(canvas);
    renderer.setSize(width, height, false);
    updateProjection(width, height);
    publishSnapshot();
  }

  function render(time = 0) {
    const delta = state.lastTime ? (time - state.lastTime) / 1000 : 0;
    state.lastTime = time;

    rotateObjects(world.objects, delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
    state.animationId = window.requestAnimationFrame(render);
  }

  resize();
  render();

  const observer = createResizeObserver(canvas, resize);

  return {
    setViewHeight(viewHeight) {
      state.viewHeight = viewHeight;
      resize();
    },
    setZoom(zoom) {
      state.zoom = zoom;
      resize();
    },
    setDistance(distance) {
      state.distance = distance;
      placeCamera(camera, distance);
      publishSnapshot();
    },
    dispose() {
      window.cancelAnimationFrame(state.animationId);
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
