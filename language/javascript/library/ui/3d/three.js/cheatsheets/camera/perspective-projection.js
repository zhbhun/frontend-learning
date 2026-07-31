/*
演示 PerspectiveCamera 的透视、裁剪与投影矩阵生效时机。

输入是 fov、near、far、zoom、相机距离和“更新矩阵”开关；操作会写入相机
属性，并按开关决定是否调用 updateProjectionMatrix()；画面、矩阵有效 FOV、
目标距离处的观察范围和视锥内物体共同证明实际生效状态。
*/

import * as THREE from 'three';

import { placeCamera } from '../../assets/shared-scene.js';
import {
  readPerspectiveMatrixFov,
  setPerspectiveProjectionProperties,
  updatePerspectiveProjection
} from './camera-model.js';
import { createCameraExampleFrame } from './camera-example-frame.js';

export const perspectiveProjectionExample = {
  create(canvas, emitSnapshot) {
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 20);
    const state = {
      aspect: 1,
      distance: 8,
      matrixCurrent: true,
      error: '无'
    };

    placeCamera(camera, state.distance);

    const frame = createCameraExampleFrame({
      canvas,
      camera,
      emitSnapshot,
      onResize(aspect) {
        state.aspect = aspect;
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
        state.matrixCurrent = true;
      },
      readSnapshot() {
        const viewSize = camera.getViewSize(
          state.distance,
          new THREE.Vector2()
        );

        return {
          propertyFov: camera.getEffectiveFOV(),
          matrixFov: readPerspectiveMatrixFov(camera),
          near: camera.near,
          far: camera.far,
          distance: state.distance,
          viewSize,
          matrixCurrent: state.matrixCurrent,
          error: state.error
        };
      }
    });

    return { camera, frame, state };
  },

  apply(instance, args) {
    const options = {
      fov: args.fov,
      aspect: instance.state.aspect,
      near: args.near,
      far: args.far,
      zoom: args.zoom
    };

    instance.state.distance = args.distance;
    placeCamera(instance.camera, args.distance);

    try {
      if (args.updateProjectionMatrix) {
        updatePerspectiveProjection(instance.camera, options);
        instance.state.matrixCurrent = true;
      } else {
        setPerspectiveProjectionProperties(instance.camera, options);
        instance.state.matrixCurrent = false;
      }

      instance.state.error = '无';
    } catch (error) {
      instance.state.error = error.message;
    }

    instance.frame.render();
  },

  readout(snapshot) {
    return [
      ['属性有效 FOV', `${snapshot.propertyFov.toFixed(1)}°`],
      ['矩阵有效 FOV', `${snapshot.matrixFov.toFixed(1)}°`],
      [
        '目标处观察范围',
        `${snapshot.viewSize.x.toFixed(2)} × ${snapshot.viewSize.y.toFixed(2)}`
      ],
      ['属性 near → far', `${snapshot.near.toFixed(2)} → ${snapshot.far.toFixed(2)}`],
      ['相机到目标距离', snapshot.distance.toFixed(1)],
      [
        '投影矩阵',
        snapshot.matrixCurrent ? '已同步' : '未同步：画面仍使用旧矩阵'
      ],
      ['视锥内物体', snapshot.visibleObjects.join('、') || '无'],
      ['输入检查', snapshot.error]
    ];
  }
};
