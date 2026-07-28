/*
本示例演示 OrthographicCamera 的观察盒（left/right/top/bottom）、zoom 和相机距离对画面的影响。
Controls 里的 viewHeight 推导观察盒高度，再按画布宽高比推出宽度；zoom 对应 camera.zoom；
distance 走 placeCamera()。

读代码先看 updateProjection()：它用 viewHeight 和画布宽高比推导观察盒，再调用 updateProjectionMatrix() 生效。
预期观察：物体远近完全不改变屏幕大小；viewHeight 越大观察盒越大、物体越小；
zoom 越大可见范围越小、物体越大；画面角落的读数显示当前可见宽高。
*/

import * as THREE from 'three';
import {
  createCameraTargetScene,
  createRenderer,
  createRenderLoop,
  createResizeObserver,
  disposeObjectTree,
  formatVector,
  placeCamera,
  readCanvasSize,
  rotateObjects
} from '../../../../assets/shared-scene.js';

const initialState = {
  viewHeight: 5.5,
  zoom: 1,
  near: 0.1,
  // far 故意压到 22。立方体沿视线方向的深度是 distance + 4.12，所以拖到 18 以上它就会被裁掉，
  // “远近不改变大小，但会影响是否被裁剪”这句话因此在控件范围内能真的被看到。
  far: 22,
  distance: 12
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

  const loop = createRenderLoop(canvas, (delta) => {
    rotateObjects(world.objects, delta);
    renderer.render(world.scene, camera);
    publishSnapshot();
  });

  resize();
  loop.renderOnce();

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
      loop.dispose();
      observer.disconnect();
      disposeObjectTree(world.scene);
      renderer.dispose();
    }
  };
}
