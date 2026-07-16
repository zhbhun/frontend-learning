import * as THREE from 'three';

const PLANE_AXES = {
  XY: ['x', 'y'],
  YZ: ['y', 'z'],
  XZ: ['x', 'z']
};
const COLLECTIONS = ['gizmo', 'picker'];
const MODES = ['translate', 'scale'];
const VIEWPORT_AWARE_STATE = Symbol('viewportAwarePlaneHandles');
const localEye = new THREE.Vector3();
const inverseWorldQuaternion = new THREE.Quaternion();
const mirrorMatrix = new THREE.Matrix4();

function cameraSide(value) {
  return value < -1e-6 ? -1 : 1;
}

function getFacingSigns(gizmo) {
  localEye.copy(gizmo.eye);

  const space = gizmo.mode === 'scale' ? 'local' : gizmo.space;
  if (space === 'local') {
    inverseWorldQuaternion.copy(gizmo.worldQuaternion).invert();
    localEye.applyQuaternion(inverseWorldQuaternion);
  }

  return {
    x: cameraSide(localEye.x),
    y: cameraSide(localEye.y),
    z: cameraSide(localEye.z)
  };
}

function createPlaneVariants(group, original, planeName, decoratedHandles, clonedHandles) {
  const axes = PLANE_AXES[planeName];

  for (const firstSign of [1, -1]) {
    for (const secondSign of [1, -1]) {
      const signs = { x: 1, y: 1, z: 1 };
      signs[axes[0]] = firstSign;
      signs[axes[1]] = secondSign;

      let handle = original;
      if (firstSign !== 1 || secondSign !== 1) {
        handle = original.clone();
        handle.geometry = original.geometry.clone();
        mirrorMatrix.makeScale(signs.x, signs.y, signs.z);
        handle.geometry.applyMatrix4(mirrorMatrix);
        group.add(handle);
        clonedHandles.push(handle);
      }

      handle.userData.viewportAwarePlane = { axes, signs };
      decoratedHandles.push(handle);
    }
  }
}

/**
 * Mirrors TransformControls plane handles into the camera-facing quadrant without
 * changing the attached object's pivot or transform math.
 */
export function enableViewportAwarePlaneHandles(transformControls) {
  const gizmo = transformControls._gizmo;

  if (!gizmo?.gizmo || !gizmo?.picker) {
    throw new TypeError('TransformControls internal gizmo is unavailable');
  }

  if (gizmo[VIEWPORT_AWARE_STATE]) {
    return gizmo[VIEWPORT_AWARE_STATE].disable;
  }

  const decoratedHandles = [];
  const clonedHandles = [];
  const originalHandles = [];

  for (const collection of COLLECTIONS) {
    for (const mode of MODES) {
      const group = gizmo[collection][mode];

      for (const planeName of Object.keys(PLANE_AXES)) {
        const original = group.children.find(
          (child) => child.name === planeName && !child.userData.viewportAwarePlane
        );

        if (!original) continue;
        originalHandles.push(original);
        createPlaneVariants(group, original, planeName, decoratedHandles, clonedHandles);
      }
    }
  }

  const hadOwnUpdate = Object.hasOwn(gizmo, 'updateMatrixWorld');
  const originalUpdateMatrixWorld = gizmo.updateMatrixWorld;

  gizmo.updateMatrixWorld = function updateViewportAwareMatrixWorld(force) {
    originalUpdateMatrixWorld.call(this, force);

    const facingSigns = getFacingSigns(this);

    for (const handle of decoratedHandles) {
      const { axes, signs } = handle.userData.viewportAwarePlane;
      const facesCamera = axes.every((axis) => signs[axis] === facingSigns[axis]);

      handle.visible = handle.visible && facesCamera;

      // Raycaster can inspect invisible picker groups, so collapse inactive variants too.
      if (!facesCamera) {
        handle.scale.setScalar(1e-10);
        handle.updateMatrixWorld(true);
      }
    }
  };

  function disable() {
    if (gizmo[VIEWPORT_AWARE_STATE]?.disable !== disable) return;

    if (hadOwnUpdate) {
      gizmo.updateMatrixWorld = originalUpdateMatrixWorld;
    } else {
      delete gizmo.updateMatrixWorld;
    }

    for (const handle of clonedHandles) {
      handle.removeFromParent();
      handle.geometry.dispose();
    }

    for (const handle of originalHandles) {
      delete handle.userData.viewportAwarePlane;
    }

    delete gizmo[VIEWPORT_AWARE_STATE];
  }

  gizmo[VIEWPORT_AWARE_STATE] = { disable };
  return disable;
}
