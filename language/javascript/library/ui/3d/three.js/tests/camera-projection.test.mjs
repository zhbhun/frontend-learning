import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OrthographicCamera,
  PerspectiveCamera
} from 'three';

const cameraModelUrl = new URL(
  '../cheatsheets/camera/camera-model.js',
  import.meta.url
);

test('相机投影模型可以作为独立模块加载', async () => {
  const cameraModel = await import(cameraModelUrl).catch(() => null);

  assert.ok(cameraModel, '缺少可复用的相机投影模型');
});

test('aimCamera 会把相机朝向目标并返回世界空间观察方向', async () => {
  const { aimCamera } = await import(cameraModelUrl);

  assert.equal(typeof aimCamera, 'function', '缺少 aimCamera');

  const camera = new PerspectiveCamera();
  const direction = aimCamera(camera, {
    position: [0, 0, 5],
    target: [0, 0, 0]
  });

  assert.deepEqual(camera.position.toArray(), [0, 0, 5]);
  assert.ok(Math.abs(direction.x) < 1e-12);
  assert.ok(Math.abs(direction.y) < 1e-12);
  assert.ok(Math.abs(direction.z + 1) < 1e-12);
});

test('aimCamera 拒绝位置与目标重合并保留上一有效相机状态', async () => {
  const { aimCamera } = await import(cameraModelUrl);
  const camera = new PerspectiveCamera();

  aimCamera(camera, {
    position: [0, 0, 5],
    target: [0, 0, 0]
  });

  const previousPosition = camera.position.toArray();
  const previousQuaternion = camera.quaternion.toArray();

  assert.throws(
    () =>
      aimCamera(camera, {
        position: [2, 3, 4],
        target: [2, 3, 4]
      }),
    /相机位置不能与观察目标重合/
  );
  assert.deepEqual(camera.position.toArray(), previousPosition);
  assert.deepEqual(camera.quaternion.toArray(), previousQuaternion);
});

test('updatePerspectiveProjection 会更新透视参数和投影矩阵', async () => {
  const { updatePerspectiveProjection } = await import(cameraModelUrl);

  assert.equal(
    typeof updatePerspectiveProjection,
    'function',
    '缺少 updatePerspectiveProjection'
  );

  const camera = new PerspectiveCamera();
  const previousMatrix = camera.projectionMatrix.toArray();

  updatePerspectiveProjection(camera, {
    fov: 60,
    aspect: 1.5,
    near: 0.5,
    far: 80,
    zoom: 1.25
  });

  assert.equal(camera.fov, 60);
  assert.equal(camera.aspect, 1.5);
  assert.equal(camera.near, 0.5);
  assert.equal(camera.far, 80);
  assert.equal(camera.zoom, 1.25);
  assert.notDeepEqual(camera.projectionMatrix.toArray(), previousMatrix);
});

test('只写透视属性时 projectionMatrix 保持旧值', async () => {
  const { setPerspectiveProjectionProperties } = await import(cameraModelUrl);
  const camera = new PerspectiveCamera();
  const previousMatrix = camera.projectionMatrix.toArray();

  setPerspectiveProjectionProperties(camera, {
    fov: 70,
    aspect: 1.5,
    near: 0.5,
    far: 80,
    zoom: 1.25
  });

  assert.equal(camera.fov, 70);
  assert.deepEqual(camera.projectionMatrix.toArray(), previousMatrix);
});

test('updatePerspectiveProjection 拒绝 near 为 0 或 far 不大于 near', async () => {
  const { updatePerspectiveProjection } = await import(cameraModelUrl);
  const camera = new PerspectiveCamera();
  const previousState = {
    fov: camera.fov,
    aspect: camera.aspect,
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
    matrix: camera.projectionMatrix.toArray()
  };

  assert.throws(
    () =>
      updatePerspectiveProjection(camera, {
        fov: 50,
        aspect: 1,
        near: 0,
        far: 100,
        zoom: 1
      }),
    /near 必须大于 0/
  );
  assert.throws(
    () =>
      updatePerspectiveProjection(camera, {
        fov: 50,
        aspect: 1,
        near: 10,
        far: 10,
        zoom: 1
      }),
    /far 必须大于 near/
  );
  assert.deepEqual(
    {
      fov: camera.fov,
      aspect: camera.aspect,
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      matrix: camera.projectionMatrix.toArray()
    },
    previousState
  );
});

test('updateOrthographicProjection 会按画面比例更新正交盒和投影矩阵', async () => {
  const { updateOrthographicProjection } = await import(cameraModelUrl);

  assert.equal(
    typeof updateOrthographicProjection,
    'function',
    '缺少 updateOrthographicProjection'
  );

  const camera = new OrthographicCamera();
  const previousMatrix = camera.projectionMatrix.toArray();

  updateOrthographicProjection(camera, {
    aspect: 2,
    viewHeight: 6,
    near: 0,
    far: 50,
    zoom: 2
  });

  assert.equal(camera.left, -6);
  assert.equal(camera.right, 6);
  assert.equal(camera.top, 3);
  assert.equal(camera.bottom, -3);
  assert.equal(camera.near, 0);
  assert.equal(camera.far, 50);
  assert.equal(camera.zoom, 2);
  assert.notDeepEqual(camera.projectionMatrix.toArray(), previousMatrix);
});

test('只写正交属性时 projectionMatrix 保持旧值', async () => {
  const { setOrthographicProjectionProperties } = await import(cameraModelUrl);
  const camera = new OrthographicCamera();
  const previousMatrix = camera.projectionMatrix.toArray();

  setOrthographicProjectionProperties(camera, {
    aspect: 2,
    viewHeight: 6,
    near: 0,
    far: 50,
    zoom: 2
  });

  assert.deepEqual(
    [camera.left, camera.right, camera.top, camera.bottom],
    [-6, 6, 3, -3]
  );
  assert.deepEqual(camera.projectionMatrix.toArray(), previousMatrix);
});

test('updateOrthographicProjection 拒绝无效画面比例并保持原有边界', async () => {
  const { updateOrthographicProjection } = await import(cameraModelUrl);
  const camera = new OrthographicCamera(-4, 4, 2, -2, 0, 20);
  const previousState = {
    bounds: [camera.left, camera.right, camera.top, camera.bottom],
    near: camera.near,
    far: camera.far,
    zoom: camera.zoom,
    matrix: camera.projectionMatrix.toArray()
  };

  assert.throws(
    () =>
      updateOrthographicProjection(camera, {
        aspect: 0,
        viewHeight: 6,
        near: 0,
        far: 50,
        zoom: 1
      }),
    /aspect 必须大于 0/
  );
  assert.deepEqual(
    {
      bounds: [camera.left, camera.right, camera.top, camera.bottom],
      near: camera.near,
      far: camera.far,
      zoom: camera.zoom,
      matrix: camera.projectionMatrix.toArray()
    },
    previousState
  );
});
