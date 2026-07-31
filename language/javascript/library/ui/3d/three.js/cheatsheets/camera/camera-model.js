/*
本课的可复用相机模型。

输入是相机的位置、观察目标或投影参数；主要操作是更新 Object3D 变换，
或批量写入投影属性后重建 projectionMatrix；预期结果是观察方向、裁剪范围
和画面缩放都与输入一致。阅读时先看三个公开更新函数，再看属性校验。
*/

import { Vector2, Vector3 } from 'three';

function assertCamera(camera, typeFlag, typeName) {
  if (!camera?.isCamera) {
    throw new TypeError('camera 必须是 THREE.Camera');
  }

  if (typeFlag && !camera[typeFlag]) {
    throw new TypeError(`camera 必须是 ${typeName}`);
  }
}

function assertFiniteNumber(value, label) {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${label} 必须是有限数字`);
  }
}

function assertPositive(value, label) {
  assertFiniteNumber(value, label);

  if (value <= 0) {
    throw new RangeError(`${label} 必须大于 0`);
  }
}

function validatePerspectiveOptions({ fov, aspect, near, far, zoom }) {
  assertPositive(fov, 'fov');

  if (fov >= 180) {
    throw new RangeError('fov 必须小于 180');
  }

  assertPositive(aspect, 'aspect');
  assertPositive(near, 'near');
  assertFiniteNumber(far, 'far');
  assertPositive(zoom, 'zoom');

  if (far <= near) {
    throw new RangeError('far 必须大于 near');
  }
}

function validateOrthographicOptions({
  aspect,
  viewHeight,
  near,
  far,
  zoom
}) {
  assertPositive(aspect, 'aspect');
  assertPositive(viewHeight, 'viewHeight');
  assertFiniteNumber(near, 'near');
  assertFiniteNumber(far, 'far');
  assertPositive(zoom, 'zoom');

  if (near < 0) {
    throw new RangeError('near 必须大于或等于 0');
  }

  if (far <= near) {
    throw new RangeError('far 必须大于 near');
  }
}

export function aimCamera(camera, { position, target }) {
  assertCamera(camera);

  const positionVector = new Vector3().fromArray(position);
  const targetVector = new Vector3().fromArray(target);

  if (positionVector.distanceToSquared(targetVector) <= Number.EPSILON) {
    throw new RangeError('相机位置不能与观察目标重合');
  }

  camera.position.copy(positionVector);
  camera.lookAt(targetVector);
  camera.updateWorldMatrix(true, false);

  return camera.getWorldDirection(new Vector3());
}

export function setPerspectiveProjectionProperties(camera, options) {
  assertCamera(camera, 'isPerspectiveCamera', 'THREE.PerspectiveCamera');
  validatePerspectiveOptions(options);

  camera.fov = options.fov;
  camera.aspect = options.aspect;
  camera.near = options.near;
  camera.far = options.far;
  camera.zoom = options.zoom;
  return camera;
}

export function updatePerspectiveProjection(camera, options) {
  setPerspectiveProjectionProperties(camera, options);
  camera.updateProjectionMatrix();
  return camera;
}

export function setOrthographicProjectionProperties(camera, options) {
  assertCamera(camera, 'isOrthographicCamera', 'THREE.OrthographicCamera');
  validateOrthographicOptions(options);

  const halfHeight = options.viewHeight / 2;
  const halfWidth = halfHeight * options.aspect;

  camera.left = -halfWidth;
  camera.right = halfWidth;
  camera.top = halfHeight;
  camera.bottom = -halfHeight;
  camera.near = options.near;
  camera.far = options.far;
  camera.zoom = options.zoom;
  return camera;
}

export function updateOrthographicProjection(camera, options) {
  setOrthographicProjectionProperties(camera, options);
  camera.updateProjectionMatrix();
  return camera;
}

export function readPerspectiveMatrixFov(camera) {
  const verticalScale = Math.abs(camera.projectionMatrix.elements[5]);
  return (2 * Math.atan(1 / verticalScale) * 180) / Math.PI;
}

export function readOrthographicMatrixSize(camera, target = new Vector2()) {
  const elements = camera.projectionMatrix.elements;
  return target.set(
    2 / Math.abs(elements[0]),
    2 / Math.abs(elements[5])
  );
}
